'use strict';

var platform    = require('./platform'),
	winston = require('winston'),
	uuid    = require('node-uuid'),
	knox	= require('knox'),
	client;

require('winston-loggly');

/*
 * Listen for the ready event.
 */
platform.once('ready', function (options) {

	client = knox.createClient({
		key: options.apikey,
		secret: options.secret,
		bucket: options.bucket
	});


	platform.log('Connected to AWS S3.');
	platform.notifyReady(); // Need to notify parent process that initialization of this plugin is done.

});

/*
 * Listen for the data event.
 */
platform.on('data', function (data) {

	var req = client.put('/data/' + uuid.v4() + '.json', {
		'Content-Length': Buffer.byteLength(string)
		, 'Content-Type': 'application/json'
	});

	req.on('response', function(res){
		if (res.statusCode !== 200) {
			console.error('Error on AWS S3.', res);
			platform.handleException(res);
		}
	});

	req.end(string);



});