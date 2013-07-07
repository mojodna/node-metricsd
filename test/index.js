"use strict";

var util = require("util");
var metricsd = require("../lib/metricsd"),
    expect = require("chai").expect;

var sleep = function(duration) {
    var now = process.hrtime();
    while (process.hrtime(now)[1] / 1e6 < duration) {}
};

describe("require('metricsd')", function() {
    it("should export a factory function", function() {
        expect(metricsd).to.be.an.instanceof(Function);
    });
});

describe("metrics", function() {
    var metrics;
    var prefix;
    var prefixed;
    var _send;

    beforeEach(function() {
        metrics = metricsd();

        prefix = "test";

        prefixed = metricsd({
            prefix: prefix
        });

        // allow metrics._send() to be mocked
        _send = metrics._send;
    });

    afterEach(function() {
        metrics._send = _send;
        prefixed._send = _send;

        _send = undefined;
        prefix = undefined;
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

            var gauge = metrics.gauge("%s", name);

            expect(gauge).to.be.an.instanceof(metrics.Gauge);
            expect(gauge.name).to.equal(name);
        });

        it("should return undefined if no name was provided", function() {
            expect(metrics.gauge()).to.equal(undefined);
        });
    });

    describe("#histogram", function() {
        it("should return a named histogram", function() {
            var name = "Paul";

            var histogram = metrics.histogram(name);

            expect(histogram).to.be.an.instanceof(metrics.Histogram);
            expect(histogram.name).to.equal(name);
        });

        it("should return undefined if no name was provided", function() {
            expect(metrics.gauge()).to.equal(undefined);
        });
    });

    describe("#inc", function() {
        it("should increment the named counter", function(done) {
            var name = "Whately";

            metrics._send = function(str) {
                expect(str).to.equal(name + ":1|c");

                done();
            };

            metrics.inc(name);
        });

        it("should increment the named counter by the specified value", function(done) {
            var name = "Florence";
            var value = 12;

            metrics._send = function(str) {
                expect(str).to.equal(name + ":" + value + "|c");

                done();
            };

            metrics.inc(name, value);
        });

        it("should do nothing if no name was provided", function(done) {
            metrics._send = function(str) {
                expect(str).to.equal(undefined);
            };

            metrics.inc();

            setTimeout(done, 10);
        });
    });

    describe("#dec", function() {
        it("should decrement the named counter", function(done) {
            var name = "x";

            metrics._send = function(str) {
                expect(str).to.equal(name + ":-1|c");

                done();
            };

            metrics.dec(name);
        });

        it("should decrement the named counter by the specified value", function(done) {
            var name = "y";
            var value = 6;

            metrics._send = function(str) {
                expect(str).to.equal(name + ":-" + value + "|c");

                done();
            };

            metrics.dec(name, 6);
        });

        it("should do nothing if no name was provided", function(done) {
            metrics._send = function(str) {
                expect(str).to.equal(undefined);
            };

            metrics.dec();

            setTimeout(done, 10);
        });
    });

    describe("#mark", function() {
        it("should mark a named meter", function(done) {
            var name = "m";

            metrics._send = function(str) {
                expect(str).to.equal(name + "");

                done();
            };

            metrics.mark(name);
        });

        it("should update a prefixed, named meter", function(done) {
            var name = "ticks";

            prefixed._send = function(str) {
                expect(str).to.equal(prefix + "." + name + "");

                done();
            };

            prefixed.mark(name);
        });

        it("should do nothing if no name was provided", function(done) {
            metrics._send = function(str) {
                expect(str).to.equal(undefined);
            };

            metrics.mark();

            setTimeout(done, 10);
        });
    });

    describe("#meter", function() {
        it("should return a named meter", function() {
            var name = "Elliot";

            var meter = metrics.meter(name);

            expect(meter).to.be.an.instanceof(metrics.Meter);
            expect(meter.name).to.equal(name);
        });

        it("should return undefined if no name was provided", function() {
            expect(metrics.meter()).to.equal(undefined);
        });
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
            var name = "timer";

            metrics._send = function(str) {
                expect(str).to.match(new RegExp(name + ":\\d+\\|h"));

                done();
            };

            var wrappedCallback = metrics.timeCallback("timer", function() {});

            setTimeout(wrappedCallback, 1);
        });
    });

    describe("#close", function() {
        it("should release internal resources");
    });

    describe("#write", function() {
        describe("in network mode", function() {
            var port = 1234;
            var sink;

            beforeEach(function(done) {
                metrics = metricsd({
                    port: port
                });

                sink = require("dgram").createSocket("udp4");

                sink.once("listening", done);

                sink.bind(port);
            });

            afterEach(function(done) {
                sink.once("close", done);

                sink.close();
            });

            it("should write a metricsd string to the network", function(done) {
                var metric = "prefix.metric.name:1234|g\n";

                sink.once("message", function(msg, rinfo) {
                    expect(msg.toString()).to.equal(metric);

                    done();
                });

                metrics.write(metric);
            });

            it("should write newline-terminated strings", function(done) {
                sink.once("message", function(msg, rinfo) {
                    expect(msg.toString()).to.match(/\n$/);

                    done();
                });

                metrics.write("event");
            });

            it("should not write metrics when disabled", function(done) {
                metrics.enabled = false;

                sink.on("message", function(msg, rinfo) {
                    throw new Error("should not have been called");
                });

                metrics.write("event");

                // give the message time to be sent (if it was indeed sent)
                setTimeout(done, 10);
            });
        });

        describe("in log mode", function() {
            beforeEach(function() {
                metrics.log = true;
            });

            it("should write a metricsd string to the console", function(done) {
                var metric = "prefix.metric.name:1234|g";

                metrics.logger = function() {
                    var msg = util.format.apply(null, arguments);
                    expect(msg).to.equal("metric=" + metric);

                    done();
                };

                metrics.write(metric);
            });

            it("should not write metrics when disabled", function(done) {
                metrics.enabled = false;

                metrics.logger = {
                    log: function(msg) {
                        throw new Error("should not have been called");
                    }
                };

                metrics.write("event");

                // give the message time to be sent (if it was indeed sent)
                setTimeout(done, 0);
            });
        });
    });

    describe("#deleteCounter", function() {
        it("should delete a named counter", function(done) {
            var name = "Dumas";

            metrics._send = function(str) {
                expect(str).to.equal(name + ":delete|c");

                done();
            };

            metrics.deleteCounter(name);
        });

        it("should delete a prefixed, named counter", function(done) {
            var name = "Alex";

            prefixed._send = function(str) {
                expect(str).to.equal(prefix + "." + name + ":delete|c");

                done();
            };

            prefixed.deleteCounter(name);
        });
    });

    describe("#deleteGauge", function() {
        it("should delete a named gauge", function(done) {
            var name = "BoulderCreek";

            metrics._send = function(str) {
                expect(str).to.equal(name + ":delete|g");

                done();
            };

            metrics.deleteGauge(name);
        });

        it("should delete a prefixed, named gauge", function(done) {
            var name = "NorthForkSouthPlatte";

            prefixed._send = function(str) {
                expect(str).to.equal(prefix + "." + name + ":delete|g");

                done();
            };

            prefixed.deleteGauge(name);
        });
    });

    describe("#deleteHistogram", function() {
        it("should delete a named histogram", function(done) {
            var name = "BooksRead";

            metrics._send = function(str) {
                expect(str).to.equal(name + ":delete|h");

                done();
            };

            metrics.deleteHistogram(name);
        });

        it("should delete a prefixed, named histogram", function(done) {
            var name = "MoviesSeen";

            prefixed._send = function(str) {
                expect(str).to.equal(prefix + "." + name + ":delete|h");

                done();
            };

            prefixed.deleteHistogram(name);
        });
    });

    describe("#deleteMeter", function() {
        it("should delete a named meter", function(done) {
            var name = "visitors";

            metrics._send = function(str) {
                expect(str).to.equal(name + ":delete");

                done();
            };

            metrics.deleteMeter(name);
        });

        it("should delete a prefixed, named meter", function(done) {
            var name = "volunteers";

            prefixed._send = function(str) {
                expect(str).to.equal(prefix + "." + name + ":delete");

                done();
            };

            prefixed.deleteMeter(name);
        });
    });

    describe("#updateCounter", function() {
        it("should update a named counter with the specified value", function(done) {
            var name = "inboxCount";
            var value = 74;

            metrics._send = function(str) {
                expect(str).to.equal(name + ":" + value + "|c");

                done();
            };

            metrics.updateCounter(name, value);
        });

        it("should update a prefixed, named counter with the specified value", function(done) {
            var name = "sentCount";
            var value = 4;

            prefixed._send = function(str) {
                expect(str).to.equal(prefix + "." + name + ":" + value + "|c");

                done();
            };

            prefixed.updateCounter(name, value);
        });
    });

    describe("#updateGauge", function() {
        it("should update a named gauge with the specified value", function(done) {
            var name = "height";
            var value = 12;

            metrics._send = function(str) {
                expect(str).to.equal(name + ":" + value + "|g");

                done();
            };

            metrics.updateGauge(name, value);
        });

        it("should update a prefixed, named gauge with the specified value", function(done) {
            var name = "width";
            var value = 7;

            prefixed._send = function(str) {
                expect(str).to.equal(prefix + "." + name + ":" + value + "|g");

                done();
            };

            prefixed.updateGauge(name, value);
        });
    });

    describe("#updateHistogram", function() {
        it("should update a named histogram with the specified value", function(done) {
            var name = "CDsOwned";
            var value = 126;

            metrics._send = function(str) {
                expect(str).to.equal(name + ":" + value + "|h");

                done();
            };

            metrics.updateHistogram(name, value);
        });

        it("should update a prefixed, named histogram with the specified value", function(done) {
            var name = "DVDsOwned";
            var value = 32;

            prefixed._send = function(str) {
                expect(str).to.equal(prefix + "." + name + ":" + value + "|h");

                done();
            };

            prefixed.updateHistogram(name, value);
        });
    });

    describe(".Counter", function() {
        var counter;
        var name;

        beforeEach(function() {
            name = "Lily";
            counter = new metrics.Counter(name);
        });

        afterEach(function() {
            counter = undefined;
            name = undefined;
        });

        it("should have a name", function() {
            expect(counter.name).to.equal(name);
        });

        it("should throw an error if a name was omitted", function() {
            var factory = function() {
                return new metrics.Counter();
            };

            expect(factory).to.throw(Error);
        });

        describe("#inc", function() {
            it("should increment the named counter", function(done) {
                metrics._send = function(str) {
                    expect(str).to.equal(name + ":1|c");

                    done();
                };

                counter.inc();
            });

            it("should increment the named counter by the specified value", function(done) {
                var value = 12;

                metrics._send = function(str) {
                    expect(str).to.equal(name + ":" + value + "|c");

                    done();
                };

                counter.inc(value);
            });
        });

        describe("#dec", function() {
            it("should decrement the named counter", function(done) {
                metrics._send = function(str) {
                    expect(str).to.equal(name + ":-1|c");

                    done();
                };

                counter.dec();
            });

            it("should decrement the named counter by the specified value", function(done) {
                var value = 57;

                metrics._send = function(str) {
                    expect(str).to.equal(name + ":-" + value + "|c");

                    done();
                };

                counter.dec(57);
            });
        });

        describe("#delete", function() {
            it("should delete the named counter", function(done) {
                metrics._send = function(str) {
                    expect(str).to.equal(name + ":delete|c");

                    done();
                };

                counter.delete();
            });
        });
    });

    describe(".Gauge", function() {
        var gauge;
        var name;

        beforeEach(function() {
            name = "Mikhail";
            gauge = new metrics.Gauge(name);
        });

        afterEach(function() {
            gauge = undefined;
            name = undefined;
        });

        it("should have a name", function() {
            expect(gauge.name).to.equal(name);
        });

        it("should throw an error if a name was omitted", function() {
            var factory = function() {
                return new metrics.Gauge();
            };

            expect(factory).to.throw(Error);
        });

        describe("#delete", function() {
            it("should delete the named gauge", function(done) {
                metrics._send = function(str) {
                    expect(str).to.equal(name + ":delete|g");

                    done();
                };

                gauge.delete();
            });
        });

        describe("#update", function() {
            it("should update the named gauge", function(done) {
                var value = 16;

                metrics._send = function(str) {
                    expect(str).to.equal(name + ":" + value + "|g");

                    done();
                };

                gauge.update(value);
            });
        });
    });

    describe(".Histogram", function() {
        var histogram;
        var name;

        beforeEach(function() {
            name = "Susan";

            histogram = new metrics.Histogram(name);
        });

        afterEach(function() {
            histogram = undefined;
            name = undefined;
        });

        it("should have a name", function() {
            expect(histogram.name).to.equal(name);
        });

        it("should throw an error if a name was omitted", function() {
            var factory = function() {
                return new metrics.Histogram();
            };

            expect(factory).to.throw(Error);
        });

        describe("#delete", function() {
            it("should delete the named histogram", function(done) {
                metrics._send = function(str) {
                    expect(str).to.equal(name + ":delete|h");

                    done();
                };

                histogram.delete();
            });
        });

        describe("#update", function() {
            it("should update the named histogram", function(done) {
                var value = 93;

                metrics._send = function(str) {
                    expect(str).to.equal(name + ":" + value + "|h");

                    done();
                };

                histogram.update(value);
            });
        });
    });

    describe(".Meter", function() {
        var meter;
        var name;

        beforeEach(function() {
            name = "Laurel";
            meter = new metrics.Meter(name);
        });

        afterEach(function() {
            meter = undefined;
            name = undefined;
        });

        it("should have a name", function() {
            expect(meter.name).to.equal(name);
        });

        it("should throw an error if a name was omitted", function() {
            var factory = function() {
                return new metrics.Meter();
            };

            expect(factory).to.throw(Error);
        });

        describe("#delete", function() {
            it("should delete the named meter", function(done) {
                metrics._send = function(str) {
                    expect(str).to.equal(name + ":delete");

                    done();
                };

                meter.delete();
            });
        });

        describe("#mark", function() {
            it("should update the named meter", function(done) {
                metrics._send = function(str) {
                    expect(str).to.equal(name);

                    done();
                };

                meter.mark();
            });
        });
    });

    describe(".Timer", function() {
        var timer;
        var name;

        beforeEach(function() {
            name = "Cyrus";
            timer = metrics.time(name);
        });

        afterEach(function() {
            timer = undefined;
            name = undefined;
        });

        it("may have a name", function() {
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

        describe("#pause", function() {
            it("should pause the timer", function() {
                var pause = 2;
                var time = timer.pause();

                sleep(pause);

                var elapsed = timer.stop();

                expect(elapsed).to.be.lessThan(pause);
            });
        });

        describe("#resume", function() {
            it("should resume the timer", function() {
                var pause = 2;
                var time = timer.pause();

                sleep(pause);

                var pausedTime = timer.resume();
                expect(pausedTime).to.be.closeTo(pause, pause * 0.5);

                sleep(pause);

                var elapsed = timer.stop();
                expect(elapsed).to.be.closeTo(pause, pause * 0.5);
            });
        });

        describe("#lap", function() {
            it("should reset the lap timer", function(done) {
                var firstLapStartTime = timer.lapStartTime;

                setTimeout(function() {
                    timer.lap();

                    expect(timer.lapStartTime).to.be.above(firstLapStartTime);

                    done();
                }, 2);
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

            it("should update a histogram with the lap name, if provided", function(done) {
                var lapName = "last";

                metrics._send = function(str) {
                    expect(str).to.match(new RegExp(lapName + ":.\\|h"));

                    done();
                };

                setTimeout(function() {
                    timer.lap(lapName);
                }, 1);
            });

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

                    expect(Math.round(timer.elapsedTime)).to.equal(0);

                    done();
                }, 1);
            });

            it("should reset the lap timer", function(done) {
                setTimeout(function() {
                    var firstLapStartedAt = timer.lapStartTime;

                    timer.start();

                    expect(timer.lapStartTime).to.not.equal(firstLapStartedAt);

                    done();
                }, 1);
            });
        });

        describe("#stop", function() {
            it("should update a histogram with the provided name", function(done) {
                var providedName = "sprint";

                metrics._send = function(str) {
                    expect(str).to.match(new RegExp(providedName + ":.\\|h"));

                    done();
                };

                timer.stop(providedName);
            });

            it("should update a histogram with the timer's name if one wasn't provided", function(done) {
                metrics._send = function(str) {
                    expect(str).to.match(new RegExp(name + ":.\\|h"));

                    done();
                };

                timer.stop();
            });

            it("should return the elapsed time", function(done) {
                setTimeout(function() {
                    expect(timer.stop()).to.be.above(0);

                    done();
                }, 1);
            });

            it("should do nothing if the timer was already stopped", function(done) {
                timer.stop();

                metrics._send = function(str) {
                    expect(str).to.equal(undefined);
                };

                var elapsedTime = timer.stop();
                expect(elapsedTime).to.equal(undefined);

                setTimeout(done, 10);
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
