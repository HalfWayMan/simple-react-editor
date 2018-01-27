/**
 * A simple event object.
 *
 * Events can have callbacks attached and detached to them. Each callback can have an
 * optional binding object. When fired, the callbacks are executed in turn.
 */
export class EditorEvent {
  /**
   * Create a new event with the given name.
   * @param {string} [name] The name of the event
   */
  constructor (name) {
    /**
     * The name of the event
     * @type {string}
     */
    this.name     = name || "<unknown event>";

    /**
     * The handlers that have been attached to this event.
     * @type {object[]}
     */
    this.handlers = [];
  }

  /**
   * Bind a callback to this event.
   *
   * The callback will be called when the {@link EditorEvent#fire} method is called
   * and will be passed the arguments that are passed to `fire`.
   *
   * @param {function} callback The callback to attach to this event
   */
  bind (callback) {
    this.bindTo (null, callback)
  }

  /**
   * Bind a callback with a given binding object to this event.
   *
   * The callback will be called when the {@link EditorEvent#fire} method is called
   * and will be bound (via `Function.prototype.bind`) to the given object. The arguments
   * that were passed to `fire` will be passed as arguments to the callback.
   *
   * @param {object}   binding  The object to bind the callback to
   * @param {function} callback The callback to attach to this event
   */
  bindTo (binding, callback) {
    if (typeof callback !== "function") {
      throw new TypeError ("Expected second argument to bindTo() to be a function");
    }

    this.handlers.push ({ binding: binding, callback: callback });
  }

  /**
   * Detach a callback from this event.
   *
   * Any callback attached to this event that have the given callback function
   * (regardless of binding object) will be detached and will no longer be called.
   *
   * @param {function} callback The callback to unattach.
   */
  unbind (callback) {
    this.handlers = this.handlers.filter ((handler) => {
      return handler.callback !== callback;
    });
  }

  /**
   * Detach a callback and binding object from this event.
   *
   * Any callback attached to this event that has the given binding object (and
   * optionally the given function) will be detached from this event and will no
   * longer be called.
   *
   * @param {object}   binding    The binding object that is to be detached
   * @param {function} [callback] Optional callback function to detach
   */
  unbindFrom (binding, callback) {
    this.handlers = this.handlers.filter ((handler) => {
      return !(handler.binding === binding && (typeof callback === "undefined" || handler.callback === callback));
    });
  }

  /**
   * Fire this event.
   *
   * This will call all the callbacks attached to this event, bound to their
   * associated binding object (if any).
   *
   * The arguments that are passed to this method will be passed to each attached
   * callback.
   *
   * If an exception is thrown in the call to an attached callback function then
   * this will be reported to the console and the event will continue to call
   * subsequent callbacks.
   */
  fire () {
    const args = Array.prototype.slice.call (arguments, [0]);
    //console.log (this.name, args);

    this.handlers.slice (0).forEach ((handler) => {
      try {
        handler.callback.apply (handler.binding, args);
      } catch (exc) {
        console.error ("Error in event handler (" + this.name + "):", exc);
      }
    });
  }
}
