"use strict";

/**
 * Export a factory function to create a Metrics instance.
 *
 * Default options are:
 *
 * {
 *     host: "localhost",
 *     port: 8125,
 *     enabled: true,
 *     prefix: null,
 *     timeout: 1000
 * }
 *
 * You may also provide your own dgram socket in options.socket if required.
 *
 * If you don't provide a socket, the internal socket will be closed to free
 * up resources every after the metrics instance has been idle for at least
 * options.timeout milliseconds. A delay of 10*timeout is also used to close
 * the internal socket in order to clear Buffers it has been holding on to.
 *
 * If options.enabled is false, all code will run but flushMetric will not
 * attempt to write to the socket, and therefore the socket will never be
 * opened. Good for testing locally if you don't care about metrics there.
 */
module.exports = function(options) {
    options = options || {};

    var host = options.host || "localhost";
    var port = options.port || 8125;
    var providedSocket = options.socket;
    var prefix = options.prefix || null;
    var enabled = 'enabled' in options ? options.enabled : true;
    var socketTimeout = options.timeout || 1000;

    var ephemeralSocket = null;
    var lastUse = null;
    var gcTimer = null;
    var closeTimeout = null;

    /**
     * Close the ephemeral socket.
     */
    var closeSocket = function() {
        if (ephemeralSocket) {
            ephemeralSocket.close();
            ephemeralSocket = null;
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
        if (new Date() - lastUse > socketTimeout) {
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
                ephemeralSocket.on("error", function(err) {});

                // try to clean up the socket periodically
                // to free up resources if this instance is idle
                gcTimer = setInterval(gcSocket, 250);

                // forcibly close the socket periodically (ignoring last use)
                // to allow sent Buffers to be GC'd
                closeTimeout = setTimeout(closeSocket, 10 * socketTimeout);
            }

            // the ephemeral socket was last used NOW.
            lastUse = new Date();

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

    API.__defineGetter__("enabled", function() {
        return enabled;
    });
    
    API.__defineSetter__("enabled", function(val) {
        enabled = val;
    });

    /**
     * The name will be appended to prefix if one was specified in
     * options and whitespace in name will be replaced with underscores.
     */
    var formatMetricName = function(name) {
        if (prefix) {
            name = prefix + "." + name;
        } else {
            name = name;
        }

        return name.replace(/\s/g, "_");
    };

    var flushMetric = function(metric) {
        if (!enabled) {
            return;
        }

        // append trailing newlines if necessary
        if (metric.lastIndexOf("\n") !== metric.length - 1) {
            metric = metric + "\n";
        }

        var buf = new Buffer(metric);

        getSocket().send(buf, 0, buf.length, port, host, function(err, bytes) {
            if (err) {
                // console.log("Error while sending data:", err.message);
            }
        });
    };

    var deleteCounter = function(name) {
        var metric = formatMetricName(name) + ":delete|c";

        flushMetric(metric);
    };

    var deleteGauge = function(name) {
        var metric = formatMetricName(name) + ":delete|g";

        flushMetric(metric);
    };

    var deleteHistogram = function(name) {
        var metric = formatMetricName(name) + ":delete|h";

        flushMetric(metric);
    };

    var deleteMeter = function(name) {
        var metric = formatMetricName(name) + ":delete";

        flushMetric(metric);
    };

    var updateCounter = function(name, value) {
        // TODO sample rate
        var metric = formatMetricName(name) + ":" + value + "|c";

        flushMetric(metric);
    };

    var updateGauge = function(name, value) {
        var metric = formatMetricName(name) + ":" + value + "|g";

        flushMetric(metric);
    };

    var updateHistogram = function(name, value) {
        // TODO sample rate
        var metric = formatMetricName(name) + ":" + value + "|h";

        flushMetric(metric);
    };

    /**
     * Create a named counter.
     */
    var Counter = function(name) {
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

        updateCounter(this.name, value);
    };

    /**
     * Decrement the counter.
     */
    Counter.prototype.dec = function(value) {
        value = (value && 0 - value) || -1;

        updateCounter(this.name, value);
    };

    /**
     * Resets the counter to 0.
     */
    Counter.prototype.clear = function() {
        deleteCounter(this.name);
    };

    /**
     * Create a named gauge.
     */
    var Gauge = function(name) {
        if (!(this instanceof Gauge)) {
            return new Gauge(name);
        }

        this.name = name;
    };

    /**
     * Update the gauge's value.
     */
    Gauge.prototype.update = function(value) {
        updateGauge(this.name, value);
    };

    /**
     * Create a named histogram.
     */
    var Histogram = function(name) {
        if (!(this instanceof Histogram)) {
            return new Histogram(name);
        }

        this.name = name;
    };

    /**
     * Update the histogram's value.
     */
    Histogram.prototype.update = function(value) {
        updateHistogram(this.name, value);
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

        this.start();
    };

    Object.defineProperty(Timer, "elapsedTime", {
        get: function() {
            return new Date() - this.startTime;
        },
        enumerable: true
    });

    /**
     * Measure a lap time.
     */
    Timer.prototype.lap = function(name) {
        var lapTime = new Date() - this.lapStartTime;
        this.resetLapTimer();

        this.laps.push([name, lapTime]);

        updateHistogram(name, lapTime);

        return lapTime;
    };

    /**
     * Reset the lap timer.
     */
    Timer.prototype.resetLapTimer = function() {
        this.lapStartTime = new Date();
    };

    /**
     * Start (or restart) the timer.
     */
    Timer.prototype.start = function() {
        this.startTime = new Date();
        this.lapStartTime = this.startTime;
        this.stopTime = null;
    };

    /**
     * Stop the timer.
     */
    Timer.prototype.stop = function(name) {
        name = name || this.name;

        // repeated calls to stop should do nothing
        if (!this.stopTime) {
            this.stopTime = new Date();
            var elapsed = this.stopTime - this.startTime;

            if (name) {
                // TODO name should be Array or string (in update*)
                updateHistogram(name, elapsed);
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

    API.write = flushMetric;
    API.deleteCounter = deleteCounter;
    API.deleteGauge = deleteGauge;
    API.deleteHistogram = deleteHistogram;
    API.deleteMeter = deleteMeter;
    API.updateCounter = updateCounter;
    API.updateGauge = updateGauge;
    API.updateHistogram = updateHistogram;

    /**
     * Create a named counter.
     *
     * Can be incremented or decremented, which can be useful if you don't have
     * an absolute value to hand. If you do, it's probably better to use a
     * gauge rather than worry about how to initialize a counter correctly ;)
     *
     */
    API.count = function(name) {
        return new Counter(name);
    };

    /**
     * Create a named gauge.
     *
     * For measuring a continuous value, such as current queue or database size.
     */
    API.gauge = function(name) {
        return new Gauge(name);
    };

    /**
     * Increment a counter.
     */
    API.inc = function(name, value) {
        value = value || 1;

        updateCounter(name, value);
    };

    /**
     * Decrement a counter.
     */
    API.dec = function(name, value) {
        value = (value && 0 - value) || -1;

        updateCounter(name, value);
    };

    /**
     * Mark an occurrence of an event.
     *
     * For measuring the rate of occurence of the named event.
     */
    API.mark = function(name) {
        var metric = formatMetricName(name);

        flushMetric(metric);
    };

    /**
     * Create a timer with optional name.
     *
     * For measuring the duration of the named event.
     * Name can also be specified in the optional stop() method.
     * Or you can read the elapsedTime property and manually
     * update a histogram yourself.
     */
    API.time = function(name) {
        return new Timer(name);
    };

    /**
     * Time from now until the callback fires.
     *
     * Returns a wrapped callback that you should pass to the method
     * that you're timing. Name and callback are both required.
     */
    API.timeCallback = function(name, callback) {
        callback = callback || function() {};

        var timer = new Timer(name);
        callback = timer.wrap(callback);
        timer.start();

        return callback;
    };

    return API;
};
