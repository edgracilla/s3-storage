'use strict';

var path          = require('path'),
	uuid          = require('node-uuid'),
	platform      = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	s3Client, s3Path;

/*
 * Listen for the data event.
 */
platform.on('data', function (data) {
	if (isPlainObject(data)) {
		var fileName = data.s3FileName || uuid.v4() + '.json';
		var filePath = path.join(s3Path, fileName);

		if (data.s3FolderPath)
			filePath = path.join(path.resolve(data.s3FolderPath), fileName);

		delete data.s3FileName;
		delete data.s3FolderPath;

		s3Client.putBuffer(new Buffer(JSON.stringify(data, null, 4)), filePath, {
			'Content-Type': 'application/json'
		}, function (error, response) {
			if (error)
				platform.handleException(error);
			else if (response.statusCode !== 200) {
				console.error('Error on AWS S3.', response.statusMessage);
				platform.handleException(new Error(response.statusMessage));
			}
			else {
				platform.log(JSON.stringify({
					title: 'Added JSON file to AWS S3',
					file: filePath,
					data: data
				}));
			}
		});
	}
	else
		platform.handleException(new Error('Invalid data received. ' + data));
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