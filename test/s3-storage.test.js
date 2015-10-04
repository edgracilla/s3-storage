'use strict';

var cp     = require('child_process'),
	should = require('should'),
	storage;

describe('Storage', function () {
	this.slow(5000);

	after('terminate child process', function (done) {
		this.timeout(5000);

		setTimeout(function () {
			storage.kill('SIGKILL');
			done();
		}, 4500);
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			should.ok(storage = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 5 seconds', function (done) {
			this.timeout(5000);

			storage.on('message', function (message) {
				if (message.type === 'ready')
					done();
			});

			storage.send({
				type: 'ready',
				data: {
					options: {
						key: 'AKIAI36Q5BC445TNH3ZA',
						secret: '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',
						bucket: 'reekoh-data',
						region: 'us-standard'
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
					key1: 'value1',
					key2: 121,
					key3: 40
				}
			}, done);
		});
	});
});