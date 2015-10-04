'use strict';

var _        = require('lodash'),
	path     = require('path'),
	uuid     = require('node-uuid'),
	knox     = require('knox'),
	platform = require('./platform'),
	config   = require('./config.json'),
	s3Client, s3path;

/*
 * Listen for the data event.
 */
platform.on('data', function (data) {
	var dataBuf = new Buffer(JSON.stringify(data, null, 4));
	var filePath = path.join(s3path, uuid.v4() + '.json');

	s3Client.putBuffer(dataBuf, filePath, {
		'Content-Type': 'application/json'
	}, function (error, response) {
		if (error)
			platform.handleException(error);
		else if (response.statusCode !== 200) {
			console.error('Error on AWS S3.', response.statusMessage);
			platform.handleException(new Error(response.statusMessage));
		}
	});
});

/*
 * Listen for the ready event.
 */
platform.once('ready', function (options) {
	s3path = _.isEmpty(options.path) ? config.path.default : path.resolve('/' + options.path);

	s3Client = knox.createClient({
		key: options.key,
		secret: options.secret,
		bucket: options.bucket,
		region: options.region || config.region.default
	});

	platform.notifyReady();
});