node-metrics
============

I am a node.js client library for [metricsd](https://github.com/mojodna/metricsd), a metrics aggregator for [Graphite](http://graphite.wikidot.com) that supports counters, histograms and meters. Metricsd 0.4.2+ is recommended.

[![Build Status](https://secure.travis-ci.org/mojodna/node-metricsd.png?branch=master)](http://travis-ci.org/mojodna/node-metricsd)

Install with `npm install metricsd` or download if you prefer.


Usage
=====

The library currently exports a factory function that creates an instance of a Metrics object with the given `options`:

```javascript

// make a metrics instance (default options are shown)
var metricsd = require('metricsd'),
    metrics = metricsd({
        host: "localhost",
        port: 8125,
        enabled: true,
        prefix: null,
        timeout: 1000
    });

```

The available options are:

 * `host` and `port` - server settings.
 * `enabled` - set to `false` if you don't want to send metrics while testing.
 * `prefix` - if you run more than one environment, machine or module, supply a `prefix` to identify all metrics from this instance.
 * `timeout` - node-metricsd cleans up the internal socket if it's idle using this timeout (milliseconds), and periodically cleans up `Buffers` using `10 * timeout`.
 * `socket` - you may provide your own dgram socket. If so, `timeout` is ignored.

The `metrics` instance exposes the options above as properties: all are read-only with the exception of `enabled` which may be toggled at any time.


Counters
========

Create a new `Counter` with `metrics.count(name)` to track relative values.

```javascript

  var counter = metrics.count('numThings');
  counter.inc(2);  // +2
  counter.dec();   // -1
  counter.clear(); // delete the counter

```

Alternatively, write directly to a named counter with convenience functions on `metrics` itself:

 * `metrics.count(name)` - create a counter
 * `metrics.inc(name,value)` - update a counter by +value
 * `metrics.dec(name,value)` - update a counter by -value
 * `metrics.updateCounter(name,value)` - update a counter by +value
 * `metrics.deleteCounter(name)` - delete a counter


Gauges
======

Create a new `Gauge` with `metrics.gauge(name)` to track absolute values.

```javascript

var gauge = metrics.gauge('numThings');
gauge.update(10); // numThings == 10
gauge.update(20); // numThings == 20
gauge.update(5);  // numThings == 5

```

Alternatively, write directly to a named gauge with convenience functions on `metrics` itself:

 * `metrics.gauge(name)` - create a gauge
 * `metrics.updateGauge(name,value)` - set the named gauge's value
 * `metrics.deleteGauge(name)` - clear a gauge


Timers
======

Create a new `Timer` with `metrics.time(name)`:

```javascript

var timer = metrics.time('thingTime');
setTimeout(function() {
  timer.stop(); // thingTime == 10ms (approx)
  assert.equal(timer.running, false); // time should be stopped
}, 10);

```

Or time a series of related events with `metrics.time(name)` and `timer.lap(name)`:

```javascript

var timer = metrics.time('otherTime');
setTimeout(function() {
  timer.lap('otherTime.lap1'); // otherTime.lap1 == 10ms (approx)
  assert.ok(timer.running); // time should not be stopped
}, 10);
setTimeout(function() {
  timer.lap('otherTime.lap2'); // otherTime.lap1 == 20ms (approx)
  assert.ok(timer.running); // time should not be stopped
}, 20);
setTimeout(function() {
  timer.stop(); // otherTime == 30ms (approx)
  assert.equal(timer.running, false); // time should be stopped
}, 30);

```

Or time an event until a callback with `metrics.time(name,callback)`. Method arguments are passed on untouched:

```javascript

var callback = metrics.timeCallback('thingTime', function(a,b,c) {
  console.log('thing happened %d,%d,%d', a, b, c); // thing happened 1,2,3
});
// ... 123ms later
callback(1,2,3); // thingTime == 123ms

```

Timers start automatically, but can be restarted by calling `timer.start()`. You can wrap callbacks yourself with `timer.wrap(callback)`.

To delete a timer, use `metrics.deleteHistogram(name)`. To update a statistical measurement directly, use `metrics.updateHistogram(name,value)`.


Meters / Marks
==============

To meter the occurence of a named event, use `metrics.mark(name)`. This is useful for measuring event rates (e.g. events per second).

To delete a meter, use `metrics.deleteMeter(name)`.


Raw Metrics
===========

To send a raw metric with no formatting or prefixes applied, use `metrics.write(metric)`. This is used internally by all other metrics. See [metricsd](https://github.com/mojodna/metricsd) for more info on formatting.


