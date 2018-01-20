/* Code that was removed from the editor but might be worth keeping */

var EditorDelayQueue = function (delay) {
  this.delay     = delay;
  this.timeout   = null;
  this.promise   = null;
  this.completer = null;
  this.action    = null;
};

EditorDelayQueue.prototype.isTriggered = function () {
  return this.timeout !== null;
};

EditorDelayQueue.prototype.push = function (action, delay) {
  this.action = action;
  this.cancelTimeout ();

  if (!this.promise) {
    this.promise = new Promise (function (result) {
      this.completer = result;
    }.bind (this), function () {
      /* */
    }).then (function () {
      this.promise = null;
      this.completer = null;

      const action = this.action;
      this.action = null;

      return action ();
    }.bind (this));
  }

  this.timeout = window.setTimeout (function () {
    this.timeout = null;
    this.completer (null);
  }.bind (this), delay || this.delay);
};

EditorDelayQueue.prototype.cancel = function () {
  this.cancelTimeout ();

  if (this.promise) {
    this.promise.cancel ();
    this.promise = null;
  }
};

EditorDelayQueue.prototype.cancelTimeout = function () {
  if (this.timeout) {
    window.clearTimeout (this.timeout);
    this.timeout = null;
  }
};
