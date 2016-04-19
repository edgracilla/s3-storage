'use strict';

var path          = require('path'),
	uuid          = require('node-uuid'),
	mime          = require('mime-types'),
	async         = require('async'),
	isArray       = require('lodash.isarray'),
	platform      = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	s3Client, s3Path, fileNameKey, fileContentKey;

let sendData = function (data, callback) {
	let fileName = '', fileContents = '';

	if (fileNameKey) {
		fileName = data[fileNameKey];
		delete data[fileNameKey];
	}
	else
		fileName = uuid.v4() + '.json';

	if (fileContentKey && data[fileContentKey]) {
		fileContents = new Buffer(data[fileContentKey], 'base64');
		delete data[fileContentKey];
	}
	else
		fileContents = new Buffer(JSON.stringify(data, null, 2));

	var filePath = path.join(s3Path, fileName);

	s3Client.putBuffer(fileContents, filePath, {
		'Content-Type': mime.lookup(fileName) || 'text/plain'
	}, (error, response) => {
		if (error)
			callback(error);
		else if (response.statusCode !== 200) {
			console.error('Error on AWS S3.', response.statusMessage);
			callback(new Error(response.statusMessage));
		}
		else {
			platform.log(JSON.stringify({
				title: 'Added JSON file to AWS S3',
				file: filePath,
				data: data
			}));

			callback();
		}
	});
};

platform.on('data', function (data) {
	if (isPlainObject(data)) {
		sendData(data, (error) => {
			if (error) platform.handleException(error);
		});
	}
	else if (isArray(data)) {
		async.each(data, (datum, done) => {
			sendData(datum, done);
		}, (error) => {
			if (error) platform.handleException(error);
		});
	}
	else
		platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`));
});

/*
 * Event to listen to in order to gracefully release all resources bound to this service.
 */
platform.on('close', function () {
	platform.notifyClose();
});

/*
 * Listen for the ready event.
 */
platform.once('ready', function (options) {
	var knox    = require('knox'),
		config  = require('./config.json'),
		isEmpty = require('lodash.isempty');

	fileNameKey = options.file_name_key;
	fileContentKey = options.file_content_key;
	s3Path = isEmpty(options.path) ? config.path.default : path.resolve('/' + options.path);

	s3Client = knox.createClient({
		key: options.key,
		secret: options.secret,
		bucket: options.bucket,
		region: options.region || config.region.default
	});

	platform.log('S3 Storage Initialized.');
	platform.notifyReady();
});