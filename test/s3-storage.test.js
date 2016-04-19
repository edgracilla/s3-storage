'use strict';

const ACCESS_KEY_ID     = 'AKIAIL4I7RNNSDFPBJBA',
	  SECRET_ACCESS_KEY = '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',
	  BUCKET            = 'reekoh-data',
	  REGION            = 'us-standard';

var cp       = require('child_process'),
	should   = require('should'),
	knox     = require('knox'),
	fileName = new Date().getTime().toString(),
	storage, s3Client;

describe('Storage', function () {
	this.slow(8000);

	before('initialize s3 client', function (done) {
		s3Client = knox.createClient({
			key: ACCESS_KEY_ID,
			secret: SECRET_ACCESS_KEY,
			bucket: BUCKET,
			region: REGION
		});

		done();
	});

	after('terminate child process and delete the test file', function (done) {
		this.timeout(5000);

		setTimeout(function () {
			storage.kill('SIGKILL');
			done();
		}, 4500);

		s3Client.deleteFile('/reekoh-test.json', function (error, response) {
			should.ifError(error);
			should.equal(204, response.statusCode);
		});
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			should.ok(storage = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 8 seconds', function (done) {
			this.timeout(8000);

			storage.on('message', function (message) {
				if (message.type === 'ready')
					done();
			});

			storage.send({
				type: 'ready',
				data: {
					options: {
						key: ACCESS_KEY_ID,
						secret: SECRET_ACCESS_KEY,
						bucket: BUCKET,
						region: REGION
					}
				}
			}, function (error) {
				should.ifError(error);
			});
		});
	});

	describe('#data', function () {
		it('should process the data', function (done) {
			storage.send({
				type: 'data',
				data: {
					s3FileName: fileName + '.json',
					s3FolderPath: '/',
					key1: 'value1',
					key2: 121,
					key3: 40
				}
			}, done);
		});

		it('should should verify that the file was inserted', function (done) {
			this.timeout(6000);

			setTimeout(function () {
				s3Client.getFile(fileName + '.json', function (error, response) {
					should.ifError(error);
					should.equal(200, response.statusCode);
					done();
				});
			}, 3000);
		});
	});
});