/**
 * A collection of useful functions used throughout the editor.
 */
export class EditorTools {
  /**
   * Convert the given object to a classname suitable for React `className` property.
   *
   * The properties of the object (accessed via `Object.keys`) are tested for truthiness. If
   * a property's value is non-false then the name of the property is added to the returned
   * classname.
   *
   * @example
   * EditorTools.classSet ({
   *   first:           true,
   *   second:          false,
   *   "another-class": true
   * });
   * // result: "first another-class"
   *
   * @param {object} obj The object to convert to a classname
   * @returns {string}
   */
  static classSet (obj) {
    return Object.keys (obj).filter (key => {
      return obj[key];
    }).join (' ');
  }

  /**
   * Join up all arguments to the function into a single classname suitable for React `className` property.
   *
   * Each argument to the function is appended to the gathered classname if it is either
   * a `string` or it is an `object`. In the case of an `object` then the argument is
   * passed to {@see EditorTools.classSet} to extract the properties from the object.
   *
   * @example
   * EditorTools.joinClasses ("first", { second: false, "another-class": true });
   * // result: "first another-class"
   *
   * @returns {string}
   */
  static classes () {
    let result = [];

    if (arguments.length > 0) {
      for (let i = 0; i < arguments.length; i++) {
        const arg = arguments[i];

        if (typeof arg === "undefined" || arg === null) {
          continue;
        }

        if (typeof arg === "string") {
          result.push (arg);
        } else if (typeof arg === "object") {
          result.push (EditorTools.classSet (arg));
        }
      }
    }

    return result.join (' ');
  }

  /**
   * Bind a callback to a DOM element event.
   *
   * This function is useful when you want to listen for events on an element
   * that is not actively controlled by React. For instance when we are handling
   * drag operations, we routinely only listen on the React element for `mousedown`
   * events. Then we bind the `mousemove` and `mouseup` events to the `document`
   * element to make sure that we handle movement outside of the element being dragged.
   *
   * @example
   * // Find an element in the document
   * var element = document.querySelector (".my-class");
   * // Listen to the 'click' event on the element
   * var remover = EditorTools.listen (element, "click", function (event) {
   *   // Write a message to the console and then remove the event
   *   console.log ("Clicked on the element; now removing");
   *   remover ();
   * });
   *
   * // Clicking on the first element matching the `.my-class` selector will
   * // write a message to the console. Subsequent clicks will perform no action.
   *
   * @param {Element}  target    The element to bind this event to
   * @param {string}   eventType The name of the event
   * @param {function} callback  The callback to bind to the event
   *
   * @returns {function} A function that unbinds the callback from the given event.
   */
  static listen (target, eventType, callback) {
    if (target.addEventListener) {
      target.addEventListener (eventType, callback, false);
      return () => {
        target.removeEventListener (eventType, callback, false);
      };
    } else if (target.attachEvent) {
      target.attachEvent ("on" + eventType, callback);
      return () => {
        target.removeEvent ("on" + eventType, callback);
      };
    }
  }
}

/**
 * A numeric ID generator.
 *
 * The result of this constructor is actually a function. Repeated calls to the
 * function will yield an ever incrementing integer. This can be used as a source
 * for simple unique IDs.
 *
 * @example
 * var next_id = new EditorIdGenerator ();
 * var first   = next_id ();
 * var second  = next_id ();
 *
 * // At this point 'first' will be 0 and 'second' will be 1.
 */
export class EditorIdGenerator {
  /**
   * Create a new ID generator.
   * @param {number} [startId] Optional start ID (default: 0)
   */
  constructor (startId) {
    var next_id = startId || 0;
    return () => {
      return next_id++;
    }
  }
}
