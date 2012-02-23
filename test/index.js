/*jshint expr:true */
/*global describe:true, before:true, beforeEach:true, after:true, afterEach:true it:true */
"use strict";

var metricsd = require("../index"),
    expect = require("chai").expect;

describe("require('metricsd')", function() {
    it("should export a factory function", function() {
        expect(metricsd).to.be.an.instanceof(Function);
    });
});

describe("metrics", function() {
    var metrics;

    before(function() {
        metrics = metricsd();
    });

    describe(".enabled", function() {
        it("should default to true", function() {
            expect(metrics.enabled).to.be.true;
        });

        it("may be disabled by providing an option to the factory", function() {
            expect(metricsd({ enabled: false }).enabled).to.be.false;
        });
    });

    describe(".port", function() {
        it("should default to 8125", function() {
            expect(metrics.port).to.eql(8125);
        });

        it("may be overridden by providing an option to the factory", function() {
            expect(metricsd({ port: 1259 }).port).to.eql(1259);
        });
    });

    describe(".host", function() {
        it("should default to 'localhost'", function() {
            expect(metrics.host).to.equal("localhost");
        });

        it("may be overridden by providing an option to the factory", function() {
            expect(metricsd({ host: "127.0.0.1" }).host).to.equal("127.0.0.1");
        });
    });

    describe(".prefix", function() {
        it("should default to null", function() {
            expect(metrics.prefix).to.equal(null);
        });

        it("may be overridden by providing an option to the factory", function() {
            expect(metricsd({ prefix: "production" }).prefix).to.equal("production");
        });
    });

    describe(".timeout (used for timing out a shared socket)", function() {
        it("should default to 1s", function() {
            expect(metrics.timeout).to.equal(1000);
        });

        it("may be overridden by providing an option to the factory", function() {
            expect(metricsd({ timeout: 250 }).timeout).to.equal(250);
        });
    });

    describe(".socket", function() {
        it("should default to null", function() {
            expect(metrics.socket).to.equal(null);
        });

        it("may be overridden by providing an option to the factory", function() {
            var socket = require("dgram").createSocket("udp4");
            expect(metricsd({ socket: socket }).socket).to.equal(socket);
        });
    });

    it("should close idle sockets");
    it("should periodically close active sockets to avoid leaking memory");

    describe("#count", function() {
        it("should return a named counter", function() {
            var name = "Jackie";

            var counter = metrics.count(name);

            expect(counter).to.be.an.instanceof(metrics.Counter);
            expect(counter.name).to.equal(name);
        });

        it("should return undefined if no name was provided", function() {
            expect(metrics.count()).to.equal(undefined);
        });
    });

    describe("#gauge", function() {
        it("should return a named gauge", function() {
            var name = "Brian";

            var gauge = metrics.gauge(name);

            expect(gauge).to.be.an.instanceof(metrics.Gauge);
            expect(gauge.name).to.equal(name);
        });

        it("should return undefined if no name was provided", function() {
            expect(metrics.gauge()).to.equal(undefined);
        });
    });

    describe("#inc", function() {
        it("should increment the named counter");
        it("should increment the named counter by the specified value");
    });

    describe("#dec", function() {
        it("should decrement the named counter");
        it("should decrement the named counter by the specified value");
    });

    describe("#mark", function() {
        it("should mark a named meter");
        it("should do nothing if no name was provided");
    });

    describe("#time", function() {
        it("should return a named timer", function() {
            var name = "Bob";

            var timer = metrics.time(name);

            expect(timer).to.be.an.instanceof(metrics.Timer);
            expect(timer.name).to.equal(name);
        });

        it("should return an anonymous timer if no name was provided", function() {
            var timer = metrics.time();

            expect(timer).to.be.an.instanceof(metrics.Timer);
            expect(timer.name).to.equal(undefined);
        });
    });

    describe("#timeCallback", function() {
        it("should throw if no args were provided", function() {
            expect(metrics.timeCallback).to.throw(Error);
        });

        it("should throw if a name is omitted", function() {
            expect(metrics.timeCallback.bind(null, function() {})).to.throw(Error);
        });

        it("should wrap a callback with a named timer", function(done) {
            var callback = function() {
                // TODO check via stubbed write call
                // expect(timer.stopped).to.be.true;
                // expect(timer.elapsedTime).to.be.above(0)

                done();
            };

            var wrappedCallback = metrics.timeCallback("timer", callback);

            setTimeout(wrappedCallback, 1);
        });
    });

    describe("#close", function() {
        it("should release internal resources");
    });

    describe("#write", function() {
        it("should write a metricsd string to the network");
    });

    describe("#deleteCounter", function() {
        it("should delete a named counter");
    });

    describe("#deleteGauge", function() {
        it("should delete a named gauge");
    });

    describe("#deleteHistogram", function() {
        it("should delete a named histogram");
    });

    describe("#deleteMeter", function() {
        it("should delete a named meter");
    });

    describe("#updateCounter", function() {
        it("should update named counter with the specified value");
    });

    describe("#updateGauge", function() {
        it("should update a named gauge with the specified value");
    });

    describe("#updateHistogram", function() {
        it("should update a named histogram with the specified value");
    });

    describe(".Counter", function() {
        var counter;

        it("should have a name", function() {
            var name = "Lily";

            counter = new metrics.Counter(name);

            expect(counter.name).to.equal(name);
        });

        it("should throw an error if a name was omitted", function() {
            var factory = function() {
                return new metrics.Counter();
            };

            expect(factory).to.throw(Error);
        });

        describe("#inc", function() {
            it("should increment the named counter");
            it("should increment the named counter by the specified value");
        });

        describe("#dec", function() {
            it("should decrement the named counter");
            it("should decrement the named counter by the specified value");
        });

        describe("#clear", function() {
            it("should clear the named counter");
        });
    });

    describe(".Gauge", function() {
        var gauge;

        it("should have a name", function() {
            var name = "Mikhail";

            gauge = new metrics.Gauge(name);

            expect(gauge.name).to.equal(name);
        });

        it("should throw an error if a name was omitted", function() {
            var factory = function() {
                return new metrics.Gauge();
            };

            expect(factory).to.throw(Error);
        });

        describe("#update", function() {
            it("should update the named gauge");
        });
    });

    describe(".Histogram", function() {
        var histogram;

        it("should have a name", function() {
            var name = "Susan";

            histogram = new metrics.Histogram(name);

            expect(histogram.name).to.equal(name);
        });

        it("should throw an error if a name was omitted", function() {
            var factory = function() {
                return new metrics.Histogram();
            };

            expect(factory).to.throw(Error);
        });

        describe("#update", function() {
            it("should update the named histogram");
        });
    });

    describe(".Timer", function() {
        var timer;
        beforeEach(function() {
            timer = metrics.time();
        });

        it("may have a name", function() {
            var name = "Cyrus";

            timer = new metrics.Timer(name);

            expect(timer.name).to.equal(name);
        });

        it("may not have a name", function() {
            timer = new metrics.Timer();

            expect(timer.name).to.equal(undefined);
        });

        describe("#constructor", function() {
            it("should start the timer", function(done) {
                expect(timer.running).to.be.true;

                setTimeout(function() {
                    expect(timer.elapsedTime).to.be.above(0);

                    done();
                }, 1);
            });
        });

        describe(".elapsedTime", function() {
            it("should measure the elapsed time since the timer was started", function(done) {
                setTimeout(function() {
                    expect(timer.elapsedTime).to.be.above(0);

                    done();
                }, 1);
            });
        });

        describe(".running", function() {
            it("should show whether the timer is currently running", function() {
                expect(timer.running).to.be.true;

                timer.stop();

                expect(timer.running).to.be.false;

                timer.start();

                expect(timer.running).to.be.true;
            });
        });

        describe(".stopped", function() {
            it("should show whether the timer is currently stopped", function() {
                expect(timer.stopped).to.be.false;

                timer.stop();

                expect(timer.stopped).to.be.true;

                timer.start();

                expect(timer.stopped).to.be.false;
            });
        });

        describe("#lap", function() {
            it("should reset the lap timer", function(done) {
                var firstLapStartTime = timer.lapStartTime;

                setTimeout(function() {
                    timer.lap();

                    expect(timer.lapStartTime).to.be.above(firstLapStartTime);

                    done();
                }, 1);
            });

            it("should update .laps with an anonymous lap if no name was provided", function(done) {
                expect(timer.laps).to.be.empty;

                setTimeout(function() {
                    timer.lap();

                    var lap = timer.laps[0];
                    expect(lap.name).to.equal("");
                    expect(lap.time).to.be.above(0);

                    done();
                }, 1);
            });

            it("should update .laps with the provided lap name", function(done) {
                expect(timer.laps).to.be.empty;

                setTimeout(function() {
                    var lapName = "first";

                    timer.lap(lapName);

                    var lap = timer.laps[0];
                    expect(lap.name).to.equal(lapName);
                    expect(lap.time).to.be.above(0);

                    done();
                }, 1);
            });

            it("should update a histogram with the lap name, if provided");

            it("should return the lap time", function(done) {
                setTimeout(function() {
                    var lapTime = timer.lap();

                    expect(lapTime).to.be.above(0);

                    done();
                }, 1);
            });
        });

        describe("#start", function() {
            it("should reset the timer", function(done) {
                setTimeout(function() {
                    expect(timer.elapsedTime).to.be.above(0);

                    timer.start();

                    expect(timer.elapsedTime).to.equal(0);

                    done();
                }, 1);
            });

            it("should reset the lap timer", function() {
              
            });

            it("should reset the stop time", function() {
                expect(timer.stopTime).to.equal(null);

                timer.stop();

                expect(timer.stopTime).to.be.above(0);

                timer.start();

                expect(timer.stopTime).to.equal(null);
            });
        });

        describe("#stop", function() {
            it("should update a histogram with the provided name");
            it("should update a histogram with the timer's name if one wasn't provided");

            it("should return the elapsed time", function(done) {
                setTimeout(function() {
                    expect(timer.stop()).to.be.above(0);

                    done();
                }, 1);
            });

            it("should do nothing if the timer was already stopped", function() {
                timer.stop();

                var elapsedTime = timer.stop();
                expect(elapsedTime).to.equal(undefined);

                // TODO ensure that no write call occurred
            });
        });

        describe("#wrap", function() {
            it("should wrap a callback and stop the timer when the callback is executed", function(done) {
                var callback = function() {
                    expect(timer.stopped).to.be.true;

                    done();
                };

                var wrappedCallback = timer.wrap(callback);

                expect(timer.running).to.be.true;

                wrappedCallback();
            });

            it("should pass all arguments through to the callback", function(done) {
                var callback = function(a, b) {
                    expect(a).to.equal("a");
                    expect(b).to.equal("b");

                    done();
                };

                var wrappedCallback = timer.wrap(callback);

                wrappedCallback("a", "b");
            });
        });
    });
});
