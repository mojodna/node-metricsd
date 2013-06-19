"use strict";

var util = require("util");

/**
 * Export a factory function to create a Metrics instance.
 *
 * Default options are:
 *
 * {
 *     host: "localhost",
 *     port: 8125,
 *     enabled: true,
 *     log: false,
 *     logger: console,
 *     prefix: null,
 *     timeout: 1000
 * }
 *
 * You may also provide your own dgram-ish socket as options.socket if required.
 *
 * If you don't provide a socket, the internal socket will be closed to free
 * up resources every after the metrics instance has been idle for at least
 * options.timeout milliseconds. A delay of 10*timeout is also used to close
 * the internal socket in order to clear Buffers it has been holding on to.
 *
 * If options.enabled is false, all code will run but API.write will never emit
 * metrics (either via socket or log), and therefore the socket will never be
 * opened. Good for testing locally if you don't care about metrics there.
 */
module.exports = function(options) {
    options = options || {};

    var host = options.host || "localhost";
    var port = options.port || 8125;
    var providedSocket = options.socket || null;
    var prefix = options.prefix || null;
    var enabled = 'enabled' in options ? options.enabled : true;
    var socketTimeout = options.timeout || 1000;
    var log = 'log' in options ? options.log : false;
    var logger = options.logger || console;

    var ephemeralSocket = null;
    var lastUse = null;
    var gcTimer = null;
    var closeTimeout = null;
    var middleware = null;

    /**
     * Close the ephemeral socket.
     */
    var closeSocket = function() {
        if (ephemeralSocket) {
            ephemeralSocket.close();
            ephemeralSocket = null;

            // this was probably called due to closeTimeout, but clear it just
            // in case
            clearTimeout(closeTimeout);
            closeTimeout = null;
        }
    };

    /**
     * Clear the socket cleanup timer.
     */
    var removeTimer = function() {
        if (gcTimer) {
            clearInterval(gcTimer);
            gcTimer = null;
        }
    };

    /**
     * Garbage collect the socket if possible.
     */
    var gcSocket = function() {
        if (Date.now() - lastUse > socketTimeout) {
            closeSocket();
            removeTimer();
        }
    };

    var getSocket = function() {
        if (providedSocket) {
            return providedSocket;
        } else {
            // create an ephemeral socket
            if (!ephemeralSocket) {
                ephemeralSocket = require("dgram").createSocket("udp4");

                // don't wait for this to be closed
                ephemeralSocket.unref && ephemeralSocket.unref();

                // prevent errors (that we don't care about) from propagating
                ephemeralSocket.on("error", function(err) {});

                // try to clean up the socket periodically to free up resources
                // if this instance is idle
                gcTimer = setInterval(gcSocket, 250);

                // don't wait for the timer to exit
                gcTimer.unref && gcTimer.unref();

                // forcibly close the socket periodically (ignoring last use)
                // to allow sent Buffers to be GC'd
                closeTimeout = setTimeout(closeSocket, 10 * socketTimeout);

                // don't wait for the timer to exit
                closeTimeout.unref && closeTimeout.unref();
            }

            // the ephemeral socket was last used NOW.
            lastUse = Date.now();

            return ephemeralSocket;
        }
    };

    // object that will be returned by require("metrics")()
    var API = {};

    /**
     * Release resources created by the metrics library.
     */
    API.close = function() {
        closeSocket();
        removeTimer();
    };

    Object.defineProperty(API, "enabled", {
        get: function() {
            return enabled;
        },
        set: function(value) {
            enabled = value;
        },
        enumerable: true
    });

    Object.defineProperty(API, "host", {
        get: function() {
            return host;
        },
        enumerable: true
    });

    Object.defineProperty(API, "log", {
        get: function() {
            return log;
        },
        set: function(value) {
            log = value;
        },
        enumerable: true
    });

    Object.defineProperty(API, "logger", {
        get: function() {
            return logger;
        },
        set: function(value) {
            logger = value;
        },
        enumerable: true
    });

    Object.defineProperty(API, "port", {
        get: function() {
            return port;
        },
        enumerable: true
    });

    Object.defineProperty(API, "prefix", {
        get: function() {
            return prefix;
        },
        enumerable: true
    });

    Object.defineProperty(API, "timeout", {
        get: function() {
            return socketTimeout;
        },
        enumerable: true
    });

    Object.defineProperty(API, "socket", {
        get: function() {
            return providedSocket;
        },
        enumerable: true
    });

    Object.defineProperty(API, "middleware", {
        get: function() {
            if (!middleware) {
                middleware = require("./middleware")(this);
            }

            return middleware;
        },
        enumerable: false
    });

    /**
     * The name will be appended to prefix if one was specified in
     * options and whitespace in name will be replaced with underscores.
     */
    var formatMetricName = function() {
        var name = util.format.apply(null, arguments);

        if (prefix) {
            name = prefix + "." + name;
        } else {
            name = name;
        }

        return name.replace(/\s/g, "_");
    };

    API._send = function(str) {
        if (log) {
            logger.log("metric=%s", str);
        }

        // append trailing newlines if necessary
        if (str.lastIndexOf("\n") !== str.length - 1) {
            str = str + "\n";
        }

        var buf = new Buffer(str);

        getSocket().send(buf, 0, buf.length, port, host, function(err, bytes) {
            if (err) {
                // console.log("Error while sending data:", err.message);
            }
        });
    };

    API.write = function(metric) {
        if (!enabled) {
            return;
        }

        API._send(metric);
    };

    API.deleteCounter = function(name) {
        var metric = util.format("%s:%delete|c",
                                 formatMetricName.apply(null, arguments));

        API.write(metric);
    };

    API.deleteGauge = function(name) {
        var metric = formatMetricName.apply(null, arguments) + ":delete|g";

        API.write(metric);
    };

    API.deleteHistogram = function(name) {
        var metric = formatMetricName.apply(null, arguments) + ":delete|h";

        API.write(metric);
    };

    API.deleteMeter = function(name) {
        var metric = formatMetricName.apply(null, arguments) + ":delete";

        API.write(metric);
    };

    API.updateCounter = function(name, value) {
        value = arguments[arguments.length - 1];
        // TODO sample rate
        var metric = formatMetricName.apply(null, (Array.prototype.slice.call(arguments, 0, -1))) + ":" + value + "|c";

        API.write(metric);
    };

    API.updateGauge = function(name, value) {
        value = arguments[arguments.length - 1];
        var metric = formatMetricName.apply(null, (Array.prototype.slice.call(arguments, 0, -1))) + ":" + value + "|g";

        API.write(metric);
    };

    API.updateHistogram = function(name, value) {
        value = arguments[arguments.length - 1];
        // TODO sample rate
        var metric = formatMetricName.apply(null, (Array.prototype.slice.call(arguments, 0, -1))) + ":" + value + "|h";

        API.write(metric);
    };

    /**
     * Create a named counter.
     *
     * Can be incremented or decremented, which can be useful if you don't have
     * an absolute value to hand. If you do, it's probably better to use
     * a gauge rather than worry about how to initialize a counter correctly ;)
     */
    var Counter = function(name) {
        if (!name) {
            throw new Error("a name is required");
        }

        if (!(this instanceof Counter)) {
            return new Counter(name);
        }

        this.name = name;
    };

    /**
     * Increment the counter.
     */
    Counter.prototype.inc = function(value) {
        value = value || 1;

        API.updateCounter(this.name, value);
    };

    /**
     * Decrement the counter.
     */
    Counter.prototype.dec = function(value) {
        value = (value && 0 - value) || -1;

        API.updateCounter(this.name, value);
    };

    /**
     * Tell metricsd to stop tracking this counter.
     */
    Counter.prototype.delete = function() {
        API.deleteCounter(this.name);
    };

    /**
     * Create a named gauge.
     *
     * For measuring a continuous value, such as current queue or database
     * size.
     */
    var Gauge = function(name) {
        name = formatMetricName.apply(null, arguments);

        if (!name) {
            throw new Error("a name is required");
        }

        if (!(this instanceof Gauge)) {
            return new Gauge(name);
        }

        this.name = name;
    };

    /**
     * Tell metricsd to stop tracking this gauge.
     */
    Gauge.prototype.delete = function() {
        API.deleteGauge(this.name);
    };

    /**
     * Update the gauge's value.
     */
    Gauge.prototype.update = function(value) {
        API.updateGauge(this.name, value);
    };

    /**
     * Create a named histogram.
     */
    var Histogram = function(name) {
        if (!name) {
            throw new Error("a name is required");
        }

        if (!(this instanceof Histogram)) {
            return new Histogram(name);
        }

        this.name = name;
    };

    /**
     * Tell metricsd to stop tracking this histogram.
     */
    Histogram.prototype.delete = function() {
        API.deleteHistogram(this.name);
    };

    /**
     * Update the histogram's value.
     */
    Histogram.prototype.update = function(value) {
        API.updateHistogram(this.name, value);
    };

    /**
     * Create a named Meter.
     */
    var Meter = function(name) {
        if (!name) {
            throw new Error("a name is required");
        }

        if (!(this instanceof Meter)) {
            return new Meter(name);
        }

        this.name = name;
    };

    /**
     * Tell metricsd to stop tracking this meter.
     */
    Meter.prototype.delete = function() {
        API.deleteMeter(this.name);
    };

    /**
     * Mark an occurrence of the events that this meter is tracking.
     */
    Meter.prototype.mark = function() {
        API.mark(this.name);
    };

    /**
     * Create a named timer and start it immediately. If you don't wish to start
     * timing immediately, call start() when you're ready.
     */
    var Timer = function(name) {
        if (!(this instanceof Timer)) {
            return new Timer(name);
        }

        this.name = name;
        this.startTime = null;
        this.lapStartTime = null;
        this.laps = [];
        this.stopTime = null;
        this.stopped = false;

        Object.defineProperty(this, "elapsedTime", {
            get: function() {
                return Date.now() - this.startTime;
            },
            enumerable: true
        });

        Object.defineProperty(this, "running", {
            get: function() {
                return !this.stopped;
            },
            enumerable: true
        });

        this.start();
    };

    /**
     * Measure a lap time.
     */
    Timer.prototype.lap = function(name) {
        var lapTime = Date.now() - this.lapStartTime;
        this.resetLapTimer();

        this.laps.push({
            name: name || "",
            time: lapTime
        });

        if (name) {
            API.updateHistogram(name, lapTime);
        }

        return lapTime;
    };

    /**
     * Reset the lap timer.
     */
    Timer.prototype.resetLapTimer = function() {
        this.lapStartTime = Date.now();
    };

    /**
     * Start (or restart) the timer.
     */
    Timer.prototype.start = function() {
        this.startTime = Date.now();
        this.lapStartTime = this.startTime;
        this.stopTime = null;
        this.stopped = false;
    };

    /**
     * Stop the timer.
     */
    Timer.prototype.stop = function(name) {
        name = name || this.name;

        // repeated calls to stop should do nothing
        if (!this.stopped) {
            this.stopped = true;
            this.stopTime = Date.now();
            var elapsed = this.stopTime - this.startTime;

            if (name) {
                // TODO name should be Array or string (in update*)
                API.updateHistogram(name, elapsed);
            }

            return elapsed;
        }
    };

    /**
     * Wrap a callback such that the timer stops when the callback is triggered.
     */
    Timer.prototype.wrap = function(callback) {
        var self = this;

        return function() {
            self.stop();

            callback.apply(this, arguments);
        };
    };

    API.Counter = Counter;
    API.Timer = Timer;
    API.Gauge = Gauge;
    API.Histogram = Histogram;
    API.Meter = Meter;

    /**
     * Create a named counter.
     */
    API.count = function(name) {
        try {
            return new Counter(name);
        } catch (e) {}
    };

    /**
     * Create a named gauge.
     */
    API.gauge = function(name) {
        try {
            return Gauge.apply(null, arguments);
        } catch (e) {}
    };

    /**
     * Create a named histogram.
     */
    API.histogram = function(name) {
        try {
            return new Histogram(name);
        } catch (e) {}
    };

    /**
     * Create a named meter.
     */
    API.meter = function(name) {
        try {
            return new Meter(name);
        } catch (e) {}
    };

    /**
     * Increment a counter.
     */
    API.inc = function(name, value) {
        if (arguments.length > 0) {
            value = value || 1;

            API.updateCounter(name, value);
        }
    };

    /**
     * Decrement a counter.
     */
    API.dec = function(name, value) {
        if (arguments.length > 0) {
            value = (value && 0 - value) || -1;

            API.updateCounter(name, value);
        }
    };

    /**
     * For measuring the rate of occurrences of the named event.
     */
    API.mark = function(name) {
        if (name) {
            API.write(formatMetricName(name));
        }
    };

    /**
     * Create a timer with optional name.
     *
     * For measuring the duration of the named event.
     * Name can also be specified in the optional stop() method.
     * Or you can read the elapsedTime property and manually update a histogram
     * yourself.
     */
    API.time = function(name) {
        return new Timer(name);
    };

    /**
     * Time from now until the callback fires.
     *
     * Returns a wrapped callback that you should pass to the method that
     * you're timing. Name and callback are both required.
     */
    API.timeCallback = function(name, callback) {
        if (!name || name instanceof Function) {
            throw new Error("a name is required");
        }

        var timer = new Timer(name);
        callback = timer.wrap(callback);
        timer.start();

        return callback;
    };

    return API;
};
