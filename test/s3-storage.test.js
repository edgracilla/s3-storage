/* global describe, it, after, before */
'use strict'

const fs = require('fs')
const path = require('path')
const knox = require('knox')
const amqp = require('amqplib')
const should = require('should')

const INPUT_PIPE = 'demo.pipe.storage'
const BROKER = 'amqp://guest:guest@127.0.0.1/'
const fileName = new Date().getTime().toString()

let conf = {
  key: 'AKIAIOM4O5GBVUBZQTLA',
  secret: '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',
  bucket: 'reekoh-data',
  regin: 'us-standard',
  fileNameKey: 'name',
  fileContentKey: 'contents'
}

let _app = null
let _conn = null
let _channel = null
let s3Client = null

describe('AWS S3 (img) Storage', () => {
  before('init', function () {
    process.env.BROKER = BROKER
    process.env.INPUT_PIPE = INPUT_PIPE
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(BROKER).then((conn) => {
      _conn = conn
      return conn.createChannel()
    }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })

    s3Client = knox.createClient({
      key: conf.key,
      secret: conf.secret,
      bucket: conf.bucket,
      region: conf.region
    })
  })

  after('terminate', function () {
    s3Client.deleteFile('/test.png', function (error, response) {
      should.ifError(error)
      should.equal(204, response.statusCode)
    })

    s3Client.deleteFile(`\\${fileName}.json`, function (error, response) {
      should.ifError(error)
      should.equal(204, response.statusCode)
    })

    _conn.close()
    // delete require.cache[require.resolve('../app')]
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(10000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#data - json', function () {
    it('should process the data', function (done) {
      this.timeout(10000)

      _channel.sendToQueue(INPUT_PIPE, new Buffer(JSON.stringify({
        name: `${fileName}.json`,
        key1: 'value1',
        key2: 121,
        key3: 40
      })))

      _app.once('processed', done)
    })

    it('should should verify that the file was inserted', function (done) {
      this.timeout(6000)

      s3Client.getFile(`\\${fileName}.json`, function (error, response) {
        should.ifError(error)
        should.equal(200, response.statusCode)
        done()
      })
    })
  })

  describe('#data - image', function () {
    it('should process the data', (done) => {
      this.timeout(10000)

      fs.readFile(path.join(process.cwd(), 'test', 'test-files', 'test-photo.png'), function (readFileError, data) {
        should.ifError(readFileError)

        _channel.sendToQueue(INPUT_PIPE, new Buffer(JSON.stringify({
          name: 'test.png',
          contents: new Buffer(data).toString('base64'),
          key1: 'value1',
          key2: 121,
          key3: 40
        })))
      })

      _app.once('processed', done)
    })

    it('should should verify that the file was inserted', function (done) {
      this.timeout(6000)

      setTimeout(function () {
        s3Client.getFile(`\\test.png`, function (error, response) {
          should.ifError(error)
          should.equal(200, response.statusCode)
          done()
        })
      }, 3000)
    })
  })
})

