"use strict";

// export a factory function for a metrics instance to be passed into
// OR
// add a middleware property to a metrics instance that has configured
// middleware
// e.g. metrics.middleware.Timer()
// use defineProperty to dynamically load the middleware when that property is
// accessed

/*
 * Time the request.
 */
exports.Timer = function(req, res, next) {
    req.timer = metrics.time();

    next();
};

/*
 * Generate a middleware function to measure the time to `eventName` on a given
 * res.  Requires Timer middleware to be added first. Multiple Measures can be
 * used with different names. The `name` can be a constant string or a callback
 * of the form function(req,res,eventName,elapsedTime).
 */
exports.Measure = function(eventName, name) {    
    return function(req, res, next) {

        res.once(eventName, function() {
            var metricName = name,
                elapsedTime = req.timer.elapsedTime;
            // allow optional callback for metric name:
            if (typeof name === 'function') {
                metricName = name(req, res, eventName, elapsedTime);
            }
            metrics.updateHistogram(metricName, elapsedTime);
        });

        next();
    };
};
