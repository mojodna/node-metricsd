v0.2.1: Jul 18 2013
===================

* `metrics.format(fmt, args...)` suitable for use with `metrics.write()`

v0.2.0: Jul 11 2013
===================

* High-resolution timing (using `process.hrtime()`)
* `Timer.pause()` and `Timer.resume()`
* Log stream output (as `metric=<metric>`)
* Cleaned up socket handling; `close()` is no longer necessary when using Node
  v0.10.x+
* Removed batched metrics

v0.1.4: Apr 18 2013
===================

* Added missing `metrics.histogram()`

v0.1.3: Mar 6 2012
==================

* Stop generating invalid metric values when batched

v0.1.2: Mar 6 2012
==================

* Limit batch sizes to 8kb to avoid UDP send failures

v0.1.1: Mar 6 2012
==================

* Express-compatible middleware (`metrics.middleware`)
* Batch flushing of metrics

v0.1.0: Feb 26 2012
===================

* Initial public release
