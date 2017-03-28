'use strict'

const reekoh = require('reekoh')
const plugin = new reekoh.plugins.Storage()

const path = require('path')
const uuid = require('node-uuid')
const mime = require('mime-types')
const async = require('async')
const isPlainObject = require('lodash.isplainobject')

let s3Client = null
let s3Path = null
let fileNameKey = null
let fileContentKey = null

let sendData = function (data, callback) {
  let fileName = ''
  let fileContents = ''

  if (fileNameKey) {
    fileName = data[fileNameKey]
    delete data[fileNameKey]
  } else {
    fileName = uuid.v4() + '.json'
  }

  if (fileContentKey && data[fileContentKey]) {
    fileContents = new Buffer(data[fileContentKey], 'base64')
    delete data[fileContentKey]
  } else {
    fileContents = new Buffer(JSON.stringify(data, null, 2))
  }

  let filePath = path.join(s3Path, fileName)

  s3Client.putBuffer(fileContents, filePath, {
    'Content-Type': mime.lookup(fileName) || 'text/plain'
  }, (error, response) => {
    if (error) {
      callback(error)
    } else if (response.statusCode !== 200) {
      console.error('Error on AWS S3.', response.statusCode, response.statusMessage)
      callback(new Error(response.statusMessage))
    } else {
      plugin.emit('processed')
      plugin.log(JSON.stringify({
        title: 'Added JSON file to AWS S3',
        file: filePath,
        data: data
      }))

      callback()
    }
  })
}

plugin.on('data', (data) => {
  if (isPlainObject(data)) {
    sendData(data, (error) => {
      if (error) plugin.logException(error)
    })
  } else if (Array.isArray(data)) {
    async.each(data, (datum, done) => {
      sendData(datum, done)
    }, (error) => {
      if (error) plugin.logException(error)
    })
  } else {
    plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`))
  }
})

plugin.once('ready', () => {
  let knox = require('knox')
  let config = require('./config.json')
  let isEmpty = require('lodash.isempty')

  let options = plugin.config

  fileNameKey = options.fileNameKey
  fileContentKey = options.fileContentKey
  s3Path = isEmpty(options.path) ? config.path.default : path.resolve('/' + options.path)

  s3Client = knox.createClient({
    key: options.key,
    secret: options.secret,
    bucket: options.bucket,
    region: options.region || config.region.default
  })

  plugin.log('S3 Storage Initialized.')
  plugin.emit('init')
})

module.exports = plugin
