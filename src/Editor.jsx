/**@jsx React.DOM*/

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * A simple event object.
 *
 * Events can have callbacks attached and detached to them. Each callback can have an
 * optional binding object. When fired, the callbacks are executed in turn.
 *
 * @constructor
 * @param {string} [name] The name of the event
 */
var EditorEvent = function (name) {
  this.name     = name || "<unknown event>";
  this.handlers = [];
  this.suspend  = 0;
};

/**
 * Attach a callback to this event.
 *
 * The callback will be called when the {@link EditorEvent#fire} method is called
 * and will be passed the arguments that are passed to `fire`.
 *
 * @param {function} cb The callback to attach to this event
 */
EditorEvent.prototype.bind = function (cb) {
  this.bindTo (null, cb);
};

/**
 * Attach a callback with a given binding object to this event.
 *
 * The callback will be called when the {@link EditorEvent#fire} method is called
 * and will be bound (via `Function.prototype.bind`) to the given object. The arguments
 * that were passed to `fire` will be passed as arguments to the callback.
 *
 * @param {object} binding The object to bind the callback to
 * @param {function} cb The callback to attach to this event
 */
EditorEvent.prototype.bindTo = function (binding, cb) {
  if (typeof cb !== "function") {
    throw new TypeError ("Expected second argument to bindTo() to be a function");
  }

  this.handlers.push ({ callback: cb, binding: binding });
};

/**
 * Detach a callback from this event.
 *
 * Any callback attached to this event that have the given callback function
 * (regardless of binding object) will be detached and will no longer be called.
 *
 * @param {function} cb The callback to unattach.
 */
EditorEvent.prototype.unbind = function (cb) {
  this.handlers = this.handlers.filter (function (handler) {
    return handler.callback === cb;
  });
};

/**
 * Detach a callback and binding object from this event.
 *
 * Any callback attached to this event that has the given binding object (and
 * optionally the given function) will be detached from this event and will no
 * longer be called.
 *
 * @param {object} binding The binding object that is to be detached
 * @param {*} [cb]         Optional callback function to detach
 */
EditorEvent.prototype.unbindFrom = function (binding, cb) {
  this.handlers = this.handlers.filter (function (handler) {
    return !(handler.binding === binding && (typeof cb === "undefined" || handler.callback === cb));
  });
};

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
EditorEvent.prototype.fire = function () {
  const args = Array.prototype.slice.call (arguments, [0]);

  this.handlers.slice (0).forEach (function (handler) {
    try {
      handler.callback.apply (handler.binding, args);
    } catch (err) {
      console.error ("Error in event handler (" + this.name + "):", err);
    }
  });
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * A collection of useful functions used throughout the editor.
 * @namespace
 */
var EditorTools = {};

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
EditorTools.classSet = function (obj) {
  return Object.keys (obj).filter (function (key) {
    return obj[key];
  }).join (' ');
};

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
EditorTools.joinClasses = function () {
  var result = [];

  if (arguments.length > 0) {
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];

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
};

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
EditorTools.listen = function (target, eventType, callback) {
  if (target.addEventListener) {
    target.addEventListener (eventType, callback, false);
    return function () {
      target.removeEventListener (eventType, callback, false);
    };
  } else if (target.attachEvent) {
    target.attachEvent ("on" + eventType, callback);
    return function () {
      target.removeEvent ("on" + eventType, callback);
    };
  }
};

/* --------------------------------------------------------------------------------------------------------------------------- */

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
 *
 * @constructor
 */
var EditorIdGenerator = function () {
  var next_id = 0, func = function () {
    return next_id++;
  };

  return func;
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * A row and column position in the editor.
 *
 * @constructor
 * @param {number} line
 * @param {number} column
 */
var EditorPosition = function (line, column) {
  /**
   * @type number
   */
  this.line   = line;

  /**
   * @type number
   */
  this.column = column;
};

/**
 * Create an new position that has the same row and column as this one.
 * @returns {EditorPosition}
 */
EditorPosition.prototype.clone = function () {
  return new EditorPosition (this.line, this.column);
};

/**
 * Return a string representation of the position.
 *
 * @example
 * new EditorPosition (10, 100).toString ();
 * // result: "(10:100)"
 *
 * @returns {string}
 */
EditorPosition.prototype.toString = function () {
  return "(" + this.line + ":" + this.column + ")";
};

/**
 * Test if this position is equal to another.
 *
 * @param {EditorPosition} other The position to test against
 * @returns {boolean} Whether the two positions are equal
 */
EditorPosition.prototype.equals = function (other) {
  return other.line === this.line && other.column === this.column;
};

/**
 * Test if this position is before the argument position.
 *
 * Where "before" means that it is either on a previous line or, if on the
 * same line, on a previous column.
 *
 * @param {EditorPosition} other
 * @returns {boolean} Whether this position is before the argument position
 */
EditorPosition.prototype.isBefore = function (other) {
  if (this.line < other.line) {
    return true;
  }

  if (this.line > other.line) {
    return false;
  }

  return this.column < other.column;
};

/**
 * Test if this position is before or equal to the argument position.
 *
 * That is, this position is either on a previous line or, if on the same
 * line, on a previous or equal column.
 *
 * @param {EditorPosition} other
 * @returns {boolean} Whether this position is before the argument position
 */
EditorPosition.prototype.isBeforeOrEqual = function (other) {
  if (this.line < other.line) {
    return true;
  }

  if (this.line > other.line) {
    return false;
  }

  return this.column <= other.column;
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * A range in the editor.
 *
 * A range is described by a start line and column and an end line and column.
 *
 * @constructor
 * @param {number} start_line
 * @param {number} start_col
 * @param {number} end_line
 * @param {number} end_col
 */
var EditorRange = function (start_line, start_col, end_line, end_col) {
  this.set (start_line, start_col, end_line, end_col);
};

/**
 * Clone this range.
 * @returns {EditorRange} A new range with the same location
 */
EditorRange.prototype.clone = function () {
  return new EditorRange (this.start_line, this.start_column, this.end_line, this.end_column);
};

/**
 * Return a string representation of the range.
 *
 * @example
 * new EditorRange (1, 100, 2, 4).toString ();
 * // result: "[1:100,2:4]"
 *
 * @returns {string}
 */
EditorRange.prototype.toString = function () {
  return "[" + this.start_line + ":" + this.start_column + "," + this.end_line + ":" + this.end_column + "]";
};

/**
 * Set this range to the given arguments.
 *
 * @param {number} start_line
 * @param {number} start_col
 * @param {number} end_line
 * @param {number} end_col
 */
EditorRange.prototype.set = function (start_line, start_col, end_line, end_col) {
  if ((start_line > end_line) || (start_line === end_line && start_col > end_col)) {
    this.start_line   = end_line;
    this.start_column = end_col;
    this.end_line     = start_line;
    this.end_column   = start_col;
  } else {
    this.start_line   = start_line;
    this.start_column = start_col;
    this.end_line     = end_line;
    this.end_column   = end_col;
  }
};

/**
 * Create an empty range from the given position. The start and end of the returned range
 * are the same position.
 *
 * @param {EditorPosition} position The position to create a range from
 * @returns {EditorRange}
 */
EditorRange.fromPosition = function (position) {
  return new EditorRange (position.line, position.column, position.line, position.column);
};

/**
 * Get the start row and column of this range as an `EditorPosition`.
 * @returns {EditorPosition}
 */
EditorRange.prototype.getStartLocation = function () {
  return new EditorPosition (this.start_line, this.start_column);
};

/**
 * Get the end row and column of this range as an `EditorPosition`.
 * @returns {EditorPosition}
 */
EditorRange.prototype.getEndLocation = function () {
  return new EditorPosition (this.end_line, this.end_column);
};

/**
 * Set the start location of this range.
 * @param {EditorPosition} location
 */
EditorRange.prototype.setStartLocation = function (location) {
  this.start_line   = location.line;
  this.start_column = location.column;
};

/**
 * Set the end location of this range.
 * @param {EditorPosition} location
 */
EditorRange.prototype.setEndLocation = function (location) {
  this.end_line   = location.line;
  this.end_column = location.column;
};

/**
 * Test whether this range contains the given position
 * @param {EditorPosition} location
 * @returns {boolean} Whether the location is contained within the range
 */
EditorRange.prototype.contains = function (location) {
  if (location.line < this.start_line || location.line > this.end_line) {
    return false;
  }

  if (location.line == this.start_line && location.column < this.start_column) {
    return false;
  }

  if (location.line == this.end_line && location.column > this.end_column) {
    return false;
  }

  return true;
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * An RGB color.
 *
 * @constructor
 * @param {number} r The red component
 * @param {number} g The green component
 * @param {number} b The blue component
 */
var EditorColor = function (r, g, b) {
  /**
   * The red component.
   * @type number
   */
  this.r = r;

  /**
   * The green component.
   * @type number
   */
  this.g = g;

  /**
   * The blue component.
   * @type number
   */
  this.b = b;
};

/**
 * A regular expression to match 3-digit hexadecimal colors of the form `#123`.
 * @type RegExp
 */
EditorColor.HEX3_RE = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;

/**
 * A regular expression to match 6-digit hexadecimal colors of the form `#1a2b3c`.
 * @type RegExp
 */
EditorColor.HEX6_RE = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

/**
 * A regular expression to match RGB colors of the form `rgb (123, 456, 789)`.
 * @type RegExp
 */
EditorColor.RGB_RE  = /^rgb\s*\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/;

/**
 * Parse the given string as a three- or six-digit hexadecimal color
 * @param {string} str The string to parse
 * @returns {EditorColor}
 */
EditorColor.fromHex = function (str) {
  var result = EditorColor.HEX3_RE.exec (str);
  if (result) {
    var r = parseInt (result[1], 16);
    var g = parseInt (result[2], 16);
    var b = parseInt (result[3], 16);

    return new EditorColor (r << 4 + r, g << 4 + g, b << 4 + b);
  } else {
    result = EditorColor.HEX6_RE.exec (str);
    if (result) {
      return new EditorColor (parseInt (result[1], 16), parseInt (result[2], 16), parseInt (result[3], 16));
    } else {
      throw new Error ("Invalid hex color '" + str + "'");
    }
  }
};

/**
 * Parse the given string as an RGB color
 * @param {string} str The string to parse
 * @returns {EditorColor}
 */
EditorColor.fromRGB = function (str) {
  var result = EditorColor.RGB_RE.exec (str);
  if (result) {
    return new EditorColor (parseInt (result[1], 10), parseInt (result[2], 10), parseInt (result[3], 10));
  } else {
    throw new Error ("Invalid rgb color '" + str + "'");
  }
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * Encapsulates the theme colours for the editor.
 *
 * This class contains the colours that we extract from the editor DOM under the active CSS
 * theme. These colour values are then used when rendering non-CSS-styled elements such as
 * the minimap.
 *
 * @constructor
 */
var EditorThemeColors = function () {
  /**
   * The editor background color
   * @type {EditorColor}
   * @default "#000"
   */
  this.background            = EditorColor.fromHex ("#000");

  /**
   * Whitespace colour
   * @type {EditorColor}
   * @default "#fff"
   */
  this.whitespace            = EditorColor.fromHex ("#fff");

  /**
   * Plain text colour
   * @type {EditorColor}
   * @default "#fff"
   */
  this.plain                 = EditorColor.fromHex ("#fff");

  /**
   * Comment colour
   * @type {EditorColor}
   * @default "#fff"
   */
  this.comment               = EditorColor.fromHex ("#fff");

  /**
   * Reserved word color
   * @type {EditorColor}
   * @default "#fff"
   */
  this.reserved_word         = EditorColor.fromHex ("#fff");

  /**
   * Identifier colour
   * @type {EditorColor}
   * @default "#fff"
   */
  this.identifier            = EditorColor.fromHex ("#fff");

  /**
   * Typename colour
   * @type {EditorColour}
   * @default "#fff"
   */
  this.type_name             = EditorColor.fromHex ("#fff");

  /**
   * String literal colour
   * @type {EditorColor}
   * @default "#fff"
   */
  this.string_literal        = EditorColor.fromHex ("#fff");

  /**
   * String literal escape code colour
   * @type {EditorColor}
   * @default "#fff"
   */
  this.string_literal_escape = EditorColor.fromHex ("#fff");

  /**
   * Number colour
   * @type {EditorColor}
   * @default "#fff"
   */
  this.number                = EditorColor.fromHex ("#fff");

  /**
   * Regular expression colour
   * @type {EditorColor}
   * @default "#fff"
   */
  this.regexp                = EditorColor.fromHex ("#fff");

  /**
   * The theme colours have changed.
   * @event EditorThemeColors#Changed
   */
  this.Changed = new EditorEvent ("EditorThemeColors.Changed");
};

/**
 * Extract theme colours from the DOM.
 * @param {Element} lines The element within the editor DOM that encapsulates the lines
 */
EditorThemeColors.prototype.extractFromDOM = function (lines) {
  var faux_line = document.createElement ("div");
  faux_line.className     = "line";
  faux_line.style.display = "none";
  lines.appendChild (faux_line);

  var span = document.createElement ("span");
  faux_line.appendChild (span);

  this.background = EditorColor.fromRGB (window.getComputedStyle (lines).backgroundColor);
  this.plain      = EditorColor.fromRGB (window.getComputedStyle (lines).color);

  span.className = "comment";
  this.comment = EditorColor.fromRGB (window.getComputedStyle (span).color);
  span.className = "reserved_word";
  this.reserved_word = EditorColor.fromRGB (window.getComputedStyle (span).color);
  span.className = "identifier";
  this.identifier = EditorColor.fromRGB (window.getComputedStyle (span).color);
  span.className = "type_name";
  this.type_name = EditorColor.fromRGB (window.getComputedStyle (span).color);
  span.className = "string_literal";
  this.string_literal = EditorColor.fromRGB (window.getComputedStyle (span).color);
  span.className = "string_literal_escape";
  this.string_literal_escape = EditorColor.fromRGB (window.getComputedStyle (span).color);
  span.className = "number";
  this.number = EditorColor.fromRGB (window.getComputedStyle (span).color);
  span.className = "regexp";
  this.regexp = EditorColor.fromRGB (window.getComputedStyle (span).color);

  lines.removeChild (faux_line);
  this.onChanged ();
};

/**
 * Called when the theme colours have changed.
 * @fires EditorThemeColors#Changed
 */
EditorThemeColors.prototype.onChanged = function () {
  this.Changed.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * @constructor
 */
var EditorLineMarker = function () {
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * @constructor
 * @param {EditorStore} store       The store to which this line belongs
 * @param {number}      index       The index of the line (i.e. zero-based line number)
 * @param {string}      content     The content of the line
 * @param {boolean}     [no_update] If true, the constructor will not update information
 */
var EditorLine = function (store, index, content, no_update) {
  /** The ID of this line
   * @type {number}
   */
  this.id            = store.nextLineId ();

  /** The store to which this line belongs
   * @type {EditorStore}
   */
  this.store         = store;

  /** The index of the line (i.e. zero-based line number)
   * @type {number}
   */
  this.index         = index;

  /** The content of the line
   * @type {string}
   */
  this.content       = content;

  /** The indentation of this line
   * @see {@link EditorLine#updateIndent}
   * @type {number}
   */
  this.indent        = 0;

  /** The gutter marker for this line.
   * @type {EditorLineMarker}
   * @default null
   */
  this.marker        = null;

  this.syntaxIn      = 0;     /* syntax state entering line */
  this.syntaxOut     = 0;     /* syntax state exiting line */

  /** The rendered content of this line
   * @type {string}
   * @see {@link EditorLine#computeRender}
   */
  this.render        = "";

  /**
   * The render elements of this line
   * @type {EditorSyntaxEngine.SyntaxRegion[]}
   * @see {@link EditorLine#computeRender}
   */
  this.elements      = [];

  /**
   * The content of this line has changed.
   * @event EditorLine#ContentChanged
   * @type {EditorEvent}
   */
  this.ContentChanged = new EditorEvent ("EditorLine.ContentChanged");

  /**
   * The gutter marker for this line has changed.
   * @event EditorLine#MarkerChanged
   * @type {EditorEvent}
   */
  this.MarkerChanged  = new EditorEvent ("EditorLine.MarkerChanged");

  /**
   * The line has been clicked on.
   * @event EditorLine#Clicked
   * @type {EditorEvent}
   */
  this.Clicked        = new EditorEvent ("EditorLine.Clicked");

  if (!no_update) {
    this.updateIndent ();
    this.computeRender ();
  }
};

/**
 * Set the content of the line to a new value.
 *
 * This will update the indentation information for the line (via {@link EditorLine#updateIndent})
 * and also the render information (via {@link EditorLine#computeRender}), which may result in
 * subsequent lines being updated (see {@link EditorLine#computeRender} for more information).
 *
 * @param {string} content The new content for the line
 * @fires EditorLine#ContentChanged
 * @fires EditorStore#LineContentChanged
 */
EditorLine.prototype.setContent = function (content) {
  if (content !== this.content) {
    this.content = content;
    this.updateIndent ();
    this.computeRender ();
    this.onContentChanged ();
  }
};

/**
 * Return the text content of this line from the given start column.
 * @param {number} index The start column
 * @returns {string}
 */
EditorLine.prototype.getTextFrom = function (index) {
  return this.content.slice (index);
};

/**
 * Appends the given text to the line.
 *
 * @param {string} text Text to append to this line
 * @fires EditorLine#ContentChanged
 * @fires EditorStore#LineContentChanged
 */
EditorLine.prototype.appendText = function (text) {
  this.setContent (this.content + text);
};

/**
 * Insert text at the given index.
 *
 * @param {number} index The index at which to insert the text
 * @param {string} text  The text to insert at that index
 * @fires EditorLine#ContentChanged
 * @fires EditorStore#LineContentChanged
 */
EditorLine.prototype.insertText = function (index, text) {
  if (index === this.content.length) {
    this.setContent (this.content + text);
  } else {
    this.setContent (this.content.slice (0, index) + text + this.content.slice (index));
  }
};

/**
 * Deletes a number of characters at the given index.
 *
 * @param {number} index The index at which to start deleting
 * @param {number} count The number of characters to delete
 * @fires EditorLine#ContentChanged
 * @fires EditorStore#LineContentChanged
 */
EditorLine.prototype.deleteText = function (index, count) {
  this.setContent (this.content.slice (0, index) + this.content.slice (index + count));
};

/**
 * Delete all text from the given index forward.
 *
 * @param {number} index The index to start deleting from
 * @fires EditorLine#ContentChanged
 * @fires EditorStore#LineContentChanged
 */
EditorLine.prototype.deleteTextFrom = function (index) {
  this.setContent (this.content.slice (0, index));
};

/**
 * Test whether the line contains the given string or regular expression.
 *
 * @param {string|RegExp} what String or regular expression to test
 * @returns {boolean} Whether the line contains the given value
 */
EditorLine.prototype.contains = function (what) {
  if (typeof what === "string") {
    return this.content.indexOf (what) !== -1;
  } else if (what instanceof RegExp) {
    return what.exec (this.content) !== null;
  } else return false;
};

/**
 * Test whether the line contains the given string or regular expression in the
 * given range.
 *
 * @param {string|RegExp} what  String or regular expression to test
 * @param {number}        start Start index
 * @param {number}        end   End index
 * @returns {boolean} whether the sub-range contains the given value
 */
EditorLine.prototype.containsInRange = function (what, start, end) {
  var in_range = this.content.substr (start, end - start);
  if (typeof what === "string") {
    return in_range.indexOf (what) !== -1;
  } else if (what instanceof RegExp) {
    return what.exec (in_range) !== null;
  }
};

/**
 * Returns the length of the line (in characters).
 * @returns {number} The length of the line (in characters)
 */
EditorLine.prototype.getLength = function () {
  return this.content.length;
};

/**
 * Returns a range that encloses this line.
 * @returns {EditorRange} A range that encloses this line
 */
EditorLine.prototype.getRange = function () {
  return new EditorRange (this.index, 0, this.index, this.getLength ());
};

/**
 * Queries the {@see EditorStore} for the previous line.
 * @returns {EditorLine} The previous line (or `null`)
 */
EditorLine.prototype.getPrevious = function () {
  return this.store.lines[this.index - 1] || null;
};

/**
 * Queries the {@see EditorStore} for the next line.
 * @returns {EditorLine} The next line (or `null`)
 */
EditorLine.prototype.getNext = function () {
  return this.store.lines[this.index + 1] || null;
};

/**
 * Set the gutter marker for this line.
 * @param {EditorMarker} marker The new marker for the line
 * @fires EditorLine#MarkerChanged
 */
EditorLine.prototype.setMarker = function (marker) {
  this.marker = marker;
  this.onMarkerChanged ();
};

/**
 * Clears the gutter marker for this line.
 *
 * Note that this will only fire the {@see event:EditorLine#MarkerChanged} event if
 * the line currently has a gutter marker set.
 *
 * @fires EditorLine#MarkerChanged
 */
EditorLine.prototype.clearMarker = function () {
  if (this.marker !== null) {
    this.marker = null;
    this.onMarkerChanged ();
  }
};

/**
 * Set this line as the active line.
 *
 * This will remove any secondary cursors and set the primary cursor
 * to this line.
 *
 * @see {@link EditorCursorCollection#removeSecondary}
 * @see {@link EditorCursor#setLine}
 */
EditorLine.prototype.setActive = function () {
  this.store.cursors.removeSecondary ();
  this.store.cursors.primary.setLine (this.index);
};

/**
 * Update the `indent` property of this line by examining the space characters
 * at the start of the line content.
 */
EditorLine.prototype.updateIndent = function () {
  var res = /^\s*/.exec (this.content);
  this.indent = res ? res[0].length : 0;
};

/**
 * Perform syntax rendering using the syntax engine assigned to the parent {@link EditorStore}.
 *
 * This will update the `elements` and `render` properties of the line.
 *
 * Note that if this is not the last line in the editor, and the state of the syntax highlight
 * engine ({@link EditorSyntaxEngine}) is not the same as the start state of the next line, then
 * the `computeRender` method is called on the next line automatically. This will also result
 * in the firing of the changed events for the next line (via {@link EditorLine#onContentChanged}).
 * The purpose of this is to make sure that if the syntax highlighter finishes this line in a
 * different state to when it started processing the previous line, the previous line is also
 * rendered. This ensures that changes to the state of the syntax engine cascade through the lines.
 * This is important when, for example, dealing with block-comments: when we have changed the content
 * of this line such that a block comment starts we need to cascade this style onto the subsequent
 * lines.
 */
EditorLine.prototype.computeRender = function () {
  const tab_size = this.store.config.tabSize;
  const syntax   = this.store.syntaxEngine;

  if (syntax) {
    var prev_line = this.getPrevious ();
    if (prev_line) {
      /* Our initial state is the state of our previous line's syntax engine at the end of rendering */
      syntax.state = prev_line.syntaxOut;
      this.syntaxIn = prev_line.syntaxOut;
    } else {
      /* We don't have a previous line, so start in state 0 */
      syntax.state = 0;
      this.syntaxIn = 0;
    }

    var regions = syntax.highlightLine (this.content, null, tab_size);
    this.elements = regions.regions;
  } else {
    var region = new EditorSyntaxEngine.SyntaxRegion (0);
    region.appendString ("plain", this.content);
    this.elements = [region];
  }

  var builder = [];
  this.elements.forEach (function (element) {
    builder.push ("<span");

    if (element.style) {
      builder.push (" class=\"");
      builder.push (element.style);
      builder.push ("\"");
    }

    builder.push (">");
    builder.push (element.escaped);
    builder.push ("</span>");
  });

  this.render = builder.join ('');

  if (syntax) {
    this.syntaxOut = syntax.state;

    var next_line = this.getNext ();
    if (next_line && next_line.syntaxIn !== syntax.state) {
      next_line.computeRender ();
      next_line.onContentChanged ();
    }
  }
};

/**
 * Test the character at the given column to see if it is an encapsulator.
 * @param {number} column The column to test
 * @returns {boolean} Whether the character at the given column is an encapsulator
 */
EditorLine.prototype.isEncapsulatorAt = function (column) {
  var char = this.content[column];
  return char === '[' || char === ']' || char === '(' || char === ')' || char === '{' || char === '}';
};

/**
 * Search backwards through this line to find an open encapsulator, starting at the
 * given column index. This will also count any close encapsulators to ensure that
 * the correct open encapsulator is found (rather than just the immediate first).
 *
 * This method will iterate over any previous lines if the open encapsulator could
 * not be found in this line.
 *
 * @param {number} start_col The start column to work backwards from
 * @returns {EditorPosition} The position of the previous open encapsulator (or `null`)
 */
EditorLine.prototype.getPreviousEncapsulator = function (start_col) {
  var line  = this;
  var count = 0;

  while (line !== null) {
    for (var i = start_col; i >= 0; i--) {
      var char = line.content[i];
      if (char === '{' || char === '(' || char === '[') {
        count--;
        if (!count) {
          return new EditorPosition (line.index, i);
        }
      } else if (char === '}' || char === ')' || char === ']') {
        count++;
      }
    }

    line      = line.getPrevious ();
    start_col = line.getLength () - 1;
  }

  return null;
};

/**
 * Search forwards through this line to find a close encapsulator, starting at the
 * given column index. This will also count any open encapsulators to ensure that
 * the correct close encapsulator is found (rather than just the immediate first).
 *
 * This method will iterate over any subsequent lines if the close encapsulator could
 * not be found in this line.
 *
 * @param {number} start_col The start column to work from
 * @returns {EditorPosition} The position of the next close encapsulator (or `null`)
 */
EditorLine.prototype.getNextEncapsulator = function (start_col) {
  var line  = this;
  var count = 0;

  while (line !== null) {
    for (var i = start_col; i < line.content.length; i++) {
      var char = line.content[i];
      if (char === '}' || char === ')' || char === ']') {
        count--;
        if (!count) {
          return new EditorPosition (line.index, i);
        }
      } else if (char === '{' || char === '(' || char === '[') {
        count++;
      }
    }

    line      = line.getNext ();
    start_col = 0;
  }

  return null;
};

EditorLine.prototype.findPreviousWordStart = function (start, recurse) {
  if (typeof start !== "number") {
    start = this.getLength ();
  }

  const prefix = Array.from (this.content.substring (0, start)).reverse ().join ('');
  const result = /\W*\w+/.exec (prefix);

  if (result) {
    return new EditorPosition (this, index, start - result[0].length);
  } else return recurse ? this.getPrevious ().findPreviousWordStart (null, true) : null;
};

EditorLine.prototype.findNextWordEnd = function (start, recurse) {
  start = start || 0;

  const rest   = this.content.substring (start);
  const result = /\W*\w+/.exec (rest);

  if (result) {
    return new EditorPosition (this.index, start + result[0].length);
  } else return recurse ? this.getNext ().findNextWordEnd (null, true) : null;
};

/**
 * When a method in this class changes the contents of the line that results in a requirement
 * to re-render the display, this method is used to fire the {@link EditorLine#event:ContentChanged}
 * event.
 *
 * In addition, this method will fire the {@link EditorStore#event:LineContentChanged} event
 * via the {@link EditorStore#onLineContentChanged} to notify any listeners on the store that
 * this line has had it's content modified.
 *
 * @fires EditorLine#ContentChanged
 * @fires EditorStore#LineContentChanged
 */
EditorLine.prototype.onContentChanged = function () {
  this.ContentChanged.fire ();
  this.store.onLineContentChanged (this);
};

/**
 * When the gutter marker for this line is modified and the display needs to be updated, this
 * method is called, which will fire the {@link EditorLine#event:MarkerChanged} event.
 *
 * @fires EditorLine#MarkerChanged
 */
EditorLine.prototype.onMarkerChanged = function () {
  this.MarkerChanged.fire ();
};

/**
 * When this line has been clicked upon this method is used to fire the {@link EditorLine#event:Clicked}
 * event.
 *
 * @fires EditorLine#Clicked
 */
EditorLine.prototype.onClicked = function () {
  this.Clicked.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * A clipboard for a cursor.
 *
 * @param {boolean} [primary] Whether this clipboard should try and interact with the browser
 */
var EditorClipboard = function (primary) {
  this.content = null;
  this.primary = primary || false;
  this.proxy   = null;

  if (this.primary) {
    this.createProxyElement ();
  }
};

/**
 * Create a clipboard proxy element (a `<textarea>`).
 *
 * https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
 *
 * @returns {HTMLTextAreaElement}
 */
EditorClipboard.prototype.createProxyElement = function () {
  return null;
};

/**
 * Write a value into the clipboard.
 * @param {string} text The text value to save to the clipboard
 */
EditorClipboard.prototype.write = function (text) {
  this.content = text;
};

/**
 * Read a value from the clipboard.
 * @returns {string} The content of the clipboard
 */
EditorClipboard.prototype.read = function () {
  return this.content;
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * Represents a selection for a cursor.
 *
 * @constructor
 * @param {EditorPosition} start The start position of the selection.
 */
var EditorSelection = function (start) {
  /**
   * The start position of the selection (not necessarily within the selection region)
   * @type {EditorPosition}
   */
  this.start  = start;

  /**
   * The region described by this selection
   * @type {EditorRange}
   */
  this.region = EditorRange.fromPosition (start);
};

/**
 * Adjust this selection for the given location. Essentially expanding the
 * selection forwards or backwards to include the given position.
 *
 * @param {EditorPosition} location The location to include in the selection
 */
EditorSelection.prototype.adjustForCursor = function (location) {
  if (location.isBeforeOrEqual (this.start)) {
    this.region.set (location.line, location.column, this.start.line, this.start.column);
  } else {
    this.region.set (this.start.line, this.start.column, location.line, location.column);
  }
};

EditorSelection.prototype.expandToInclude = function (location) {

}

/**
 * Create a new selection fromt he given range.
 * @param {EditorRange} range The range for the new selection
 */
EditorSelection.fromRange = function (range) {
  var selection = new EditorSelection (range.getStartLocation ());
  selection.region = range.clone ();
  return selection;
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * A cursor in the editor
 *
 * @constructor
 * @param {EditorStore} store   The store to which this cursor belongs
 * @param {number}      id      The unique ID of this cursor
 * @param {boolean}     primary Whether this is the primary cursor
 */
var EditorCursor = function (store, id, primary) {
  /**
   * The ID of this cursor (or `null`)
   * @type {number}
   */
  this.id        = id || null;

  /**
   * Whether this is the primary cursor or not
   * @type {boolean}
   */
  this.primary   = primary || false;

  /**
   * The {@link EditorStore} to which this cursor belongs
   * @type {EditorStore}
   */
  this.store     = store;

  /**
   * The position of this cursor
   * @type {EditorPosition}
   */
  this.position  = new EditorPosition (0, 0);

  /**
   * The active selection for this cursor (or `null`)
   * @type {EditorSelection}
   */
  this.selection = null;

  /**
   * The clipboard for this cursor
   * @type {EditorClipboard}
   */
  this.clipboard = new EditorClipboard (primary);

  /**
   * The line position of this cursor has changed
   * @event EditorCursor#LineChanged
   * @type {EditorEvent}
   * @param {number} prev_line Previous line
   * @param {number} new_line  New line
   */
  this.LineChanged      = new EditorEvent ("EditorCursor.LineChanged");

  /**
   * The column position of this cursor has changed
   * @event EditorCursor#ColumnChanged
   * @type {EditorEvent}
   * @param {number} prev_column Previous column
   * @param {number} new_column  New column
   */
  this.ColumnChanged    = new EditorEvent ("EditorCursor.ColumnChanged");

  /**
   * The cursor has changed
   * @event EditorCursor#Changed
   * @type {EditorEvent}
   */
  this.Changed          = new EditorEvent ("EditorCursor.Changed");

  /**
   * The cursor's selection has changed
   * @event EditorCursor#SelectionChanged
   * @type {EditorEvent}
   */
  this.SelectionChanged = new EditorEvent ("EditorCursor.SelectionChanged");
};

/**
 * Create a new cursor at the same location as this one.
 *
 * This will create a new `EditorCursor` with the same {@link EditorStore}
 * and the same `position` property (via {@link EditorPosition#clone}).
 *
 * The new cursor will automatically be added to the {@link EditorCursorCollection}
 * in the parent {@link EditorStore} (see {@link EditorStore#cursors}).
 *
 * @returns {EditorCursor} A new cursor at the same location
 */
EditorCursor.prototype.clone = function () {
  var clone = new EditorCursor (this.store);
  clone.position = this.position.clone ();
  this.store.cursors.addCursor (clone);
  return clone;
};

/**
 * Returns the {@link EditorLine} on which this cursor is located (or `null`).
 * @returns {EditorLine} The line on which this cursor resides
 */
EditorCursor.prototype.getLine = function () {
  return this.store.lines[this.position.line] || null;
};

/**
 * Set the line for this cursor.
 *
 * The line the cursor is moved to is clamped within the number of lines
 * which are in the parent {@link EditorStore} to make sure that cursors
 * are not moved outside of the valid range.
 *
 * If the cursor line is changed, then the {@link EditorCursor#event:LineChanged}
 * is fired (via {@link EditorCursor#onLineChanged}) after which the
 * {@link EditorCursor#event:Changed} is fired (via {@link EditorCursor#onChanged}).
 *
 * This is somewhat more efficient than the {@link EditorCursor#setLocation} when
 * moving the cursor line in that it is only concerned with which line the cursor
 * is on.
 *
 * @param {number} line The new line for the cursor
 * @fires EditorCursor#LineChanged
 * @fires EditorCursor#Changed
 */
EditorCursor.prototype.setLine = function (line) {
  line = Math.min (this.store.getMaxLineNumber () - 1, Math.max (0, line));

  if (line !== this.position.line) {
    var last_line = this.position.line;
    this.position.line = line;
    this.onLineChanged (last_line, line);
    this.onChanged ();
  }
};

/**
 * Set the column for this cursor.
 *
 * The column of the cursor is clamped within the current line to ensure
 * that the cursor does not move outside a valid range.
 *
 * If the cursor column is changed, then the {@link EditorCursor#event:ColumnChanged}
 * is fired (via {@link EditorCursor#onColumnChanged}) after which the
 * {@link EditorCursor#event:Changed} event is fired (via {@link EditorCursor#onChanged}).
 *
 * This is somewhat more efficient than the {@link EditorCursor#setLocation} when
 * moving the cursor column in that it is only concerned with which column the cursor
 * is on.
 *
 * @param {number} column The new column for the cursor
 * @fires EditorCursor#LineChanged
 * @fires EditorCursor#Changed
 */
EditorCursor.prototype.setColumn = function (column) {
  var line     = this.store.lines[this.position.line];

  column = Math.min (line.getLength (), Math.max (0, column));
  if (column !== this.position.column) {
    var last_column = this.position.column;
    this.position.column = column;
    this.onColumnChanged (last_column, column);
    this.onChanged ();
  }
};

/**
 * Returns the location of the cursor.
 *
 * Note that this method returns a clone of the {@link EditorPosition}
 * via {@link EditorPosition#clone}. This ensure that modifications to
 * the returned positon object does not inadvertently move the cursor
 * without firing the required events to update the view.
 *
 * @returns {EditorPosition} The location of the cursor
 */
EditorCursor.prototype.getLocation = function () {
  return this.position.clone ();
};

/**
 * Set the location (both line and column) of the cursor.
 *
 * This will set the line and column of the cursor to the line and column
 * given in the {@link EditorPosition} argument. The line and column given
 * is clamped to the current set of lines in the parent {@link EditorStore}
 * and the columns within the target line to make sure that the cursor is
 * not moved to an invalid location.
 *
 * If the cursor line is changed then the {@link EditorCursor#event:LineChanged}
 * event is fired with the previous and new line indicies (see {@link EditorCursor#onLineChanged}).
 *
 * If the cursor column is changed then the {@link EditorCursor#event:ColumnChanged}
 * event is fired with the previous and new column indices (see {@link EditorCursor#onColumnChanged}).
 *
 * If either the cursor line or column are changed then the {@link EditorCursor#event:Changed}
 * event is fired (see {@link EditorCursor#onChanged}).
 *
 * An option is given to extend the selection to include the new location
 * (see {@link EditorCursor#extendSelection}).
 *
 * @param {EditorPosition} location          The new location of the cursor
 * @param {boolean}        extend_selection  Whether to extend the selection
 */
EditorCursor.prototype.setLocation = function (location, extend_selection) {
  var prev_loc     = this.getLocation ();
  var line_index   = Math.min (this.store.getMaxLineNumber () - 1, Math.max (0, location.line));
  var line         = this.store.lines[line_index];
  var column_index = Math.min (line.getLength (), Math.max (0, location.column));

  var changed = false;

  if (this.position.line != line_index) {
    var last_line = this.position.line;

    changed            = true;
    this.position.line = line_index;
    this.onLineChanged (last_line, line_index);
  }

  if (this.position.column != column_index) {
    var last_column = this.position.column;

    changed              = true;
    this.position.column = column_index;
    this.onColumnChanged (last_column, column_index);
  }

  if (changed) {
    this.onChanged ();
  }

  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};

/**
 * Move the cursor up a number of lines (if it can), see {@link EditorCursor#setLine}.
 * If the new line invalidates the postion of the cursor it's column will be changed
 * (see {@link EditorCursor#setColumn}).
 *
 * An option is given to extend the selection to include the new location
 * (see {@link EditorCursor#extendSelection}).
 *
 * @param {number}  lines            The number of lines to move
 * @param {boolean} extend_selection Whether to extend the selection to the new location
 */
EditorCursor.prototype.moveUp = function (lines, extend_selection) {
  var prev_loc = this.getLocation ();

  this.setLine (this.position.line - lines);

  var length = this.getLine ().getLength ();
  if (this.position.column > length) {
    this.setColumn (length);
  }

  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};

/**
 * Move the cursor down a number of lines (if it can), see {@link EditorCursor#setColumn}.
 * If the new line invalidates the position of the cursor, it's column will be changed
 * (see {@link EditorCursor#setColumn}).
 *
 * An option is given to extend the selection include the new location
 * (see {@link EditorCursor#extendSelection}).
 *
 * @param {number}  lines            The number of lines to move
 * @param {boolean} extend_selection Whether to extend the selection to the new location
 */
EditorCursor.prototype.moveDown = function (lines, extend_selection) {
  var prev_loc = this.getLocation ();

  this.setLine (this.position.line + lines);

  var length = this.getLine ().getLength ();
  if (this.position.column > length) {
    this.setColumn (length);
  }

  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};


/**
 * Move the cursor to the left a number of columns (if it can), see {@link EditorCursor#setColumn}.
 *
 * @param {number}  columns          Number of columns to move
 * @param {boolean} extend_selection Whether to extend the selection
 */
EditorCursor.prototype.moveLeft = function (columns, extend_selection) {
  if (!extend_selection && this.selection) {
    this.setLocation (this.selection.region.getStartLocation ());
    this.removeSelection ();
    return;
  }

  var prev_loc = this.getLocation ();

  if (this.position.column === 0 && this.position.line > 0) {
    var line = this.store.lines[this.position.line - 1];
    this.setLocation ({ line: this.position.line - 1, column: line.getLength () });
  } else {
    this.setColumn (this.position.column - columns);
  }

  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};

EditorCursor.prototype.moveWordLeft = function (extend_selection) {
  if (!extend_selection && this.selection) {
    this.setLocation (this.selection.region.getEndLocation ());
    this.removeSelection ();
    return;
  }

  const prev_loc = this.getLocation ();
  const word_end = this.getLine ().findPreviousWordStart (this.position.column, true);

  if (word_end) {
    this.setLocation (word_end, extend_selection);
  }
};
/**
 * Move the cursor to the right a number of columns (if it can), see {@link EditorCursor#setColumn}.
 *
 * @param {number}  columns          Number of columns to move
 * @param {boolean} extend_selection Whether to extend the selection
 */
EditorCursor.prototype.moveRight = function (columns, extend_selection) {
  if (!extend_selection && this.selection) {
    this.setLocation (this.selection.region.getEndLocation ());
    this.removeSelection ();
    return;
  }

  var prev_loc = this.getLocation ();

  if (this.position.column === this.getLine ().getLength () && this.position.line < this.store.lines.length) {
    this.setLocation ({ line: this.position.line + 1, column: 0 });
  } else {
    this.setColumn (this.position.column + columns);
  }

  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};

EditorCursor.prototype.moveWordRight = function (extend_selection) {
  if (!extend_selection && this.selection) {
    this.setLocation (this.selection.region.getEndLocation ());
    this.removeSelection ();
    return;
  }

  const prev_loc = this.getLocation ();
  const word_end = this.getLine ().findNextWordEnd (this.position.column, true);

  if (word_end) {
    this.setLocation (word_end, extend_selection);
  }
};

/**
 * Move to the start of the line.
 *
 * @param {boolean} [respect_indent]   Should we respect indentation first
 * @param {boolean} [extend_selection] Whether to extend the selection
 */
EditorCursor.prototype.moveStart = function (respect_indent, extend_selection) {
  var prev_loc = this.getLocation ();

  if (respect_indent) {
    var current_indent = this.getLine ().indent;
    if (this.position.column > current_indent) {
      this.setColumn (current_indent);
    } else {
      this.setColumn (0);
    }
  } else {
    this.setColumn (0);
  }

  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};

/**
 * Move to the end of the line.
 *
 * @param {boolean} extend_selection Whether to extend the selection
 */
EditorCursor.prototype.moveEnd = function (extend_selection) {
  var prev_loc = this.getLocation ();
  this.setColumn (this.getLine ().getLength ());
  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};

/**
 * Insert text at the current cursor location.
 *
 * @param {string} text Text to insert
 */
EditorCursor.prototype.insertText = function (text) {
  if (this.selection) {
    /* replace selection */
  } else {
    this.getLine ().insertText (this.position.column, text);
    this.moveRight (text.length, false);
  }
};

/**
 * Insert a tab character at the cursor location.
 */
EditorCursor.prototype.insertTab = function () {
  var line   = this.getLine ();
  var prev   = line.getPrevious ();
  var indent = prev ? prev.indent : 0;

  if (indent && this.position.column < indent && line.containsInRange (/^\s*$/, 0, this.position.column)) {
    this.insertText (new Array (indent + 1).join (' '));
  } else {
    var tab_offset = this.position.column % this.store.config.tabSize;
    this.insertText (new Array (1 + (this.store.config.tabSize - tab_offset)).join (' '));
  }
};

/**
 * Insert a new line at the cursor location.
 *
 * @param {boolean} [auto_indent] Whether to auto-indent the new line
 */
EditorCursor.prototype.insertLine = function (auto_indent) {
  if (this.selection) {
    /* replace selection */
  } else {
    var current_indent = auto_indent ? this.getLine ().indent : 0;
    var indent         = auto_indent ? new Array (current_indent + 1).join (' ') : "";

    if (this.position.column === 0) {
      /* Special case when at start of line: just insert empty line above */
      this.store.insertLine (this.position.line, new EditorLine (this.store, 0, indent));

      if (current_indent === 0) {
        this.moveDown (1, false);
      } else {
        this.setLocation ({ line: this.position.line + 1, column: current_indent });
      }
    } else if (this.position.column === this.getLine ().getLength ()) {
      /* Special case when at end of line: just insert empty line below */
      var new_content = new Array (current_indent + 1).join (' ');
      this.store.insertLine (this.position.line + 1, new EditorLine (this.store, 0, indent));

      if (current_indent === 0) {
        this.moveDown (1, false);
      } else {
        this.setLocation ({ line: this.position.line + 1, column: current_indent });
      }
    } else {
      const line   = this.getLine ();
      const latter = line.getTextFrom (this.position.column);
      line.deleteTextFrom (this.position.column);
      this.store.insertLine (this.position.line + 1, new EditorLine (this.store, 0, indent + latter));
      this.setLocation ({ line: this.position.line + 1, column: current_indent }, false);
    }
  }
};

/**
 * Delete a number of characters backwards from the cursor location.
 */
EditorCursor.prototype.deleteBackwards = function (count) {
  if (this.selection) {
    this.deleteSelected ();
  } else {
    var line = this.getLine ();

    if (this.position.column === 0) {
      var prev = line.getPrevious ();

      if (prev) {
        var prev_original_len = prev.getLength ();

        prev.appendText (line.content);
        this.store.deleteLine (line.index);
        this.setLocation ({ line: prev.index, column: prev_original_len }, false);
      }
    } else {
      line.deleteText (this.position.column - 1, 1);
      this.moveLeft (count, false);
    }
  }
};

/**
 * Delete a number of characters forwards of the cursor location.
 */
EditorCursor.prototype.deleteForwards = function (count) {
  if (this.selection) {
    this.deleteSelected ();
  } else {
    var line = this.getLine ();

    if (this.position.column === line.getLength ()) {
      var next = line.getNext ();

      if (next) {
        line.appendText (next.content);
        this.store.deleteLine (next.index);
      }
    } else {
      line.deleteText (this.position.column, 1);
    }
  }
};

/**
 * Extend the current selection to include the current location of the
 * cursor.
 */
EditorCursor.prototype.extendSelection = function (prev_loc) {
  if (!this.selection) {
    this.selection = new EditorSelection (prev_loc);
  }

  this.selection.adjustForCursor (this.position);
  this.onSelectionChanged ();
};

/**
 * Select the entire line on which the cursor resides.
 * @param {EditorLine} [line] An optional line to select
 */
EditorCursor.prototype.selectLine = function (line) {
  if (!line) {
    line = this.getLine ();
  }

  this.selection       = EditorSelection.fromRange (line.getRange ());
  this.position.line   = line.index + 1;
  this.position.column = 0;
  this.onChanged ();
};

/**
 * Remove the selection
 */
EditorCursor.prototype.removeSelection = function () {
  if (this.selection) {
    this.selection = null;
    this.onChanged ();
  }
};

EditorCursor.prototype.deleteSelected = function () {
  if (this.selection) {
    this.store.removeSelection (this.selection);
    this.setLocation (this.selection.region.getStartLocation ());
    this.removeSelection ();
  }
};

EditorCursor.prototype.copySelected = function (cut) {
  if (this.selection) {
    var lines = this.store.acquireSelectionContent (this.selection);
    this.clipboard.write (lines.join ('\n'));

    if (cut) {
      this.deleteSelected ();
    }
  }
};

EditorCursor.prototype.paste = function () {
  var content = this.clipboard.read ();

  if (content) {
    if (content.indexOf ('\n') === -1) {
      this.insertText (content);
    } else {
      var lines = this.clipboard.read ().split ('\n');
      for (var index = 0; index < lines.length; index++) {
        this.insertText (lines[index]);
        if (index < lines.length - 1) {
          this.insertLine (false);
        }
      }
    }
  }
};


/**
 * Test if the cursor is next to an encapsulator
 */
EditorCursor.prototype.isNextToEncapsulator = function () {
  return this.getLine ().isEncapsulatorAt (this.position.column) || this.getLine ().isEncapsulatorAt (this.position.column - 1);
};

/**
 * Get the offset of cursor at the encapsualtor next to the cursor (or `null`)
 */
EditorCursor.prototype.getEncapsulatorOffset = function () {
  var line = this.getLine ();

  if (line.isEncapsulatorAt (this.position.column)) {
    return 0;
  } else if (line.isEncapsulatorAt (this.position.column - 1)) {
    return -1;
  } else {
    return null;
  }
};

/**
 * Find the matching encapsulator position
 */
EditorCursor.prototype.getMatchingEncapsulator = function () {
  var line = this.getLine ();

  var encapsulator, encapsulator_column;
  if (line.isEncapsulatorAt (this.position.column)) {
    encapsulator_column = this.position.column;
    encapsulator = line.content[encapsulator_column];
  } else if (line.isEncapsulatorAt (this.position.column - 1)) {
    encapsulator_column = this.position.column - 1;
    encapsulator = line.content[encapsulator_column];
  } else {
    return null;
  }

  if (encapsulator === '{' || encapsulator === '(' || encapsulator === '[') {
    return line.getNextEncapsulator (encapsulator_column);
  } else if (encapsulator === '}' || encapsulator === ')' || encapsulator === ']') {
    return line.getPreviousEncapsulator (encapsulator_column);
  } else {
    return null;
  }
};

/**
 * Fire the {@link EditorCursor#event:LineChanged} event and call {@link EditorStore#onCursorChanged}
 * with this cursor as an argument.
 *
 * @param {number} last_line The previous line index
 * @param {number} line      The new line index
 */
EditorCursor.prototype.onLineChanged = function (last_line, line) {
  this.LineChanged.fire (last_line, line);
  this.store.onCursorChanged (this);
};

/**
 * Fire the {@link EditorCursor#event:ColumnChanged} event and call {@link EditorStore#onCursorChanged}
 * with this cursor as an argument.
 *
 * @param {number} last_column The previous column index
 * @param {number} column      The new column index
 */
EditorCursor.prototype.onColumnChanged = function (last_column, column) {
  this.ColumnChanged.fire (last_column, column);
  this.store.onCursorChanged (this);
};

/**
 * Fire the {@link EditorCursor#event:Changed} event and call {@link EditorStore#onCursorChanged}
 * with this cursor as an argument.
 */
EditorCursor.prototype.onChanged = function () {
  this.Changed.fire ();
  this.store.onCursorChanged (this);
};

/**
 * Fire the {@link EditorCursor#event:SelectionChanged} event.
 */
EditorCursor.prototype.onSelectionChanged = function () {
  this.SelectionChanged.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * Class that provides management of a collection of cursors.
 *
 * @constructor
 * @param {EditorStore} store The store to which this collection belongs
 */
var EditorCursorCollection = function (store) {
  this.store     = store;
  this.nextId    = new EditorIdGenerator ();
  this.primary   = new EditorCursor (store, this.nextId (), true);
  this.secondary = [];
  this.lastAdded = 0;

  this.Blink      = new EditorEvent ("EditorCursorCollection.Blink");
  this.blinkIndex = false;
  this.blinker    = null;

  this.CursorAdded   = new EditorEvent ("EditorCursorCollection.CursorAdded");
  this.CursorRemoved = new EditorEvent ("EditorCursorCollection.CursorRemoved");
};

/**
 * Sort the secondary cursors into ascending ow-order.
 */
EditorCursorCollection.prototype.sortSecondary = function () {
  this.secondary.sort (function (a, b) {
    return a.position.line - b.position.line;
  });
};

/**
 * Add a new secondary cursor
 */
EditorCursorCollection.prototype.addCursor = function (cursor) {
  cursor.id = this.nextId ();
  this.secondary.push (cursor);
  this.sortSecondary ();
  this.lastAdded = this.secondary.length;
  this.onCursorAdded (cursor);
};

/**
 * Remove a secondary cursor.
 *
 * @param {EditorCursor} cursor Cursor to remove
 */
EditorCursorCollection.prototype.removeCursor = function (cursor) {
  cursor.id = null;
  this.removeCursorAt (this.secondary.indexOf (cursor));
};

/**
 * Remove a secondary cursor at the given index.
 *
 * @param {number} index The index to the cursor at
 */
EditorCursorCollection.prototype.removeCursorAt = function (index) {
  var cursor = this.secondary[index];
  if (this.lastAdded >= index + 1) {
    this.lastAdded--;
  }

  this.secondary.splice (index, 1);
  this.onCursorRemoved (cursor);
};

/**
 * Remove all secondary cursors.
 */
EditorCursorCollection.prototype.removeSecondary = function () {
  var old_secondary = this.secondary;
  this.secondary = [];

  for (var i = 0; i < old_secondary.length; i++) {
    this.onCursorRemoved (old_secondary[i]);
  }
};

/**
 * Get the index of the last added cursor.
 */
EditorCursorCollection.prototype.getLastAddedIndex = function () {
  if (this.secondary.length === 0 || this.lastAdded === 0) {
    return 0;
  } else return this.lastAdded;
};

/**
 * Get an array of all cursors including the primary cursor.
 */
EditorCursorCollection.prototype.getAll = function () {
  var result = [];

  result[0] = this.primary;
  for (var i = 0; i < this.secondary.length; i++) {
    result[i + 1] = this.secondary[i];
  }

  return result;
};

/**
 * Get the cursor with the lowest row index.
 */
EditorCursorCollection.prototype.getCursorOnLowestLine = function () {
  if (this.secondary.length === 0) {
    return this.primary;
  } else {
    var secondary = this.secondary[0];
    if (this.primary.position.isBefore (secondary.position)) {
      return this.primary;
    } else return secondary;
  }
};

/**
 * Get the cursor with the highest row index.
 */
EditorCursorCollection.prototype.getCursorOnHighestLine = function () {
  if (this.secondary.length === 0) {
    return this.primary;
  } else {
    var secondary = this.secondary[this.secondary.length - 1];
    if (!this.primary.position.isBeforeOrEqual (secondary.position)) {
      return this.primary;
    } else return secondary;
  }
};

/**
 * Perform an operation over each cursor (primary and secondary).
 */
EditorCursorCollection.prototype.forEach = function (action) {
  this.getAll ().forEach (action);
};

/**
 * Map a function over each cursor (primary and secondary) and return an
 * array of results.
 */
EditorCursorCollection.prototype.map = function (action) {
  return this.getAll ().map (action);
};

/**
 * Stop the blink timer (setting its index to the given value, falling
 * back to `false` if not set).
 */
EditorCursorCollection.prototype.stopBlink = function (set_to) {
  window.clearInterval (this.blinker);
  this.blinker    = null;
  this.blinkIndex = set_to || false;
  this.onBlinker (this.blinkIndex);
};

/**
 * Start the blink timer, setting the index to the given value, falling
 * back to `false` if not set.
 */
EditorCursorCollection.prototype.startBlink = function (set_to) {
  if (this.blinker) {
    window.clearInterval (this.blinker);
  }

  this.blinkIndex = set_to || false;
  this.onBlinker (this.blinkIndex);

  this.blinker = window.setInterval (function () {
    this.blinkIndex = !this.blinkIndex;
    this.onBlinker (this.blinkIndex);
  }.bind (this), 500);
};

/**
 *
 */
EditorCursorCollection.prototype.onBlinker = function () {
  this.Blink.fire (this.blinkIndex);
};

/**
 * @param {EditorCursor} cursor The cursor that was added
 */
EditorCursorCollection.prototype.onCursorAdded = function (cursor) {
  this.startBlink (true);
  this.CursorAdded.fire (cursor);
};

/**
 *
 * @param {EditorCursor} cursor The cursor that was removed
 */
EditorCursorCollection.prototype.onCursorRemoved = function (cursor) {
  this.startBlink (true);
  this.CursorRemoved.fire (cursor);
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 *
 * @constructor
 * @param {EditorStore}            store  The store to which this keymap belongs
 * @param {EditorKeymap.Mapping[]} keymap The initial keymap configuration (if any)
 */
var EditorKeymap = function (store, keymap) {
  this.store        = store;
  this.mappings     = [];
  this.mappingTable = {};

  this.deserialize (keymap);
};

/**
 *
 * @constructor
 * @param {string}                 mode
 * @param {string|RegExp|function} key
 * @param {boolean}                shift
 * @param {boolean}                ctrl
 * @param {boolean}                alt
 * @param {boolean}                meta
 * @param {function}               command
 */
EditorKeymap.Mapping = function (mode, key, shift, ctrl, alt, meta, command) {
  this.mode    = mode;
  this.key     = key;
  this.shift   = typeof shift === "undefined" ? null : shift;
  this.ctrl    = typeof ctrl  === "undefined" ? null : ctrl;
  this.alt     = typeof alt   === "undefined" ? null : alt;
  this.meta    = typeof meta  === "undefined" ? null : meta;
  this.command = command;

  if (mode !== null && typeof mode !== "string") {
    throw new Error ("Expected 'mode' parameter to be a string ('up', 'down', 'press') or null; found " + typeof mode);
  }

  if (typeof key !== "string" && typeof key !== "function" && !(key instanceof RegExp)) {
    throw new Error ("Expected 'key' parameter to be a string, function or RegExp; found " + typeof key);
  }

  if (this.shift !== null && typeof this.shift !== "boolean") {
    throw new Error ("Expected 'shift' argument to be a boolean or null; found " + typeof shift);
  }

  if (this.ctrl !== null && typeof this.ctrl !== "boolean") {
    throw new Error ("Expected 'ctrl' argument to be a boolean or null; found " + typeof ctrl);
  }

  if (this.alt !== null && typeof this.alt !== "boolean") {
    throw new Error ("Expected 'alt' argument to be a boolean or null; found " + typeof alt);
  }

  if (this.meta !== null && typeof this.meta !== "boolean") {
    throw new Error ("Expected 'meta' argument to be a boolean or null; found " + typeof meta);
  }

  if (typeof command !== "function") {
    throw new Error ("Expected 'command' argument to be a function; found " + typeof command);
  }

  this.keyMatcher = null;
  if (typeof this.key === "string") {
    this.keyMatcher = function (event) {
      return event.key === this.key;
    }.bind (this);
  } else if (typeof this.key === "function") {
    this.keyMatcher = this.key;
  } else if (this.key instanceof RegExp) {
    this.keyMatcher = function (event) {
      return this.key.test (event.key);
    }.bind (this);
  } else {
    this.keyMatcher = function (event) {
      console.warn ("Fallback key matcher discarding event", event.key);
      return false;
    }
  }
};

/**
 *
 */
EditorKeymap.Mapping.prototype.matchesEvent = function (mode, event) {
  return (this.mode  === null || this.mode  === mode          ) &&
         (this.shift === null || this.shift === event.shiftKey) &&
         (this.ctrl  === null || this.ctrl  === event.ctrlKey ) &&
         (this.alt   === null || this.alt   === event.altKey  ) &&
         (this.meta  === null || this.meta  === event.metaKey ) &&
         this.keyMatcher (event);
};

/**
 *
 * @param {EditorKeymap.Mapping[]} map
 */
EditorKeymap.prototype.deserialize = function (map) {
  if (map instanceof Array) {
    map.forEach (function (mapping, index) {
      if (mapping instanceof EditorKeymap.Mapping) {
        this.mappings.push (mapping);

        if (typeof mapping.key === "string") {
          if (this.mappingTable.hasOwnProperty (mapping.key)) {
            this.mappingTable[mapping.key].push (mapping);
          } else {
            this.mappingTable[mapping.key] = [mapping];
          }
        }
      } else {
        console.warn ("Expected instance of EditorKeymap.Mapping; found " + typeof mapping);
      }
    }.bind (this));

    console.debug ("Loaded " + this.mappings.length + " key mappings");
  }
};


/**
 *
 * @param {string} mode  The key event mode (`up`, `down` or `press`)
 * @param {Event}  event The event object
 */
EditorKeymap.prototype.onKeyEvent = function (mode, event) {
  const store = this.store;

  if (this.mappingTable.hasOwnProperty (event.key)) {
    const mappings = this.mappingTable[event.key];
    for (var i = 0; i < mappings.length; i++) {
      if (mappings[i].matchesEvent (mode, event)) {
        mappings[i].command (store, event);
        return true;
      }
    }
  }

  for (var i = 0; i < this.mappings.length; i++) {
    if (this.mappings[i].matchesEvent (mode, event)) {
      this.mappings[i].command (store, event);
      return true;
    }
  }

  return false;
};

/**
 *
 * @param {Event} event The event object
 */
EditorKeymap.prototype.onKeyDown = function (event) {
  return this.onKeyEvent ("down", event);
};

/**
 * @param {Event} event The event object
 */
EditorKeymap.prototype.onKeyUp = function (event) {
  return this.onKeyEvent ("up", event);
};

/**
 * @param {Event} event The event object
 */
EditorKeymap.prototype.onKeyPress = function (event) {
  return this.onKeyEvent ("press", event);
};

/**
 * The default keymap
 */
EditorKeymap.defaultKeymap = [
  /*
   * Standard Cursor Direction
   */

  new EditorKeymap.Mapping ("down", "ArrowLeft", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveLeft (1, event.shiftKey);
    });
  }),

  new EditorKeymap.Mapping ("down", "ArrowLeft", null, true, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveWordLeft (event.shiftKey);
    });
  }),

  new EditorKeymap.Mapping ("down", "ArrowRight", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveRight (1, event.shiftKey);
    });
  }),

  new EditorKeymap.Mapping ("down", "ArrowRight", null, true, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveWordRight (event.shiftKey);
    });
  }),

  new EditorKeymap.Mapping ("down", "ArrowUp", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveUp (1, event.shiftKey);
    });
  }),

  new EditorKeymap.Mapping ("down", "ArrowDown", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveDown (1, event.shiftKey);
    });
  }),

  new EditorKeymap.Mapping ("down", "Home", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveStart (true, event.shiftKey);
    });
  }),

  new EditorKeymap.Mapping ("down", "End", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveEnd (event.shiftKey);
    });
  }),

  new EditorKeymap.Mapping ("down", "Home", false, true, false, false, function (store, event) {
    store.cursors.removeSecondary ();
    store.cursors.primary.setLocation ({ line: 0, column: 0 });
  }),

  new EditorKeymap.Mapping ("down", "End", false, true, false, false, function (store, event) {
    if (store.lines.length > 0) {
      var length = store.lines[store.lines.length - 1].getLength ();

      store.cursors.removeSecondary ();
      store.cursors.primary.setLocation ({ line: store.lines.length - 1, column: length });
    } else {
      store.cursors.removeSecondary ();
      store.cursors.primary.setLocation ({ line: 0, column: 0 });
    }
  }),

  /*
   * Cursor Duplication
   */

  new EditorKeymap.Mapping ("down", "ArrowUp", true, true, false, false, function (store, event) {
    var lowest = store.cursors.getCursorOnLowestLine ();
    var cursor = lowest.clone ();
    cursor.moveUp (1, false);
  }),

  new EditorKeymap.Mapping ("down", "ArrowDown", true, true, false, false, function (store, event) {
    var highest = store.cursors.getCursorOnHighestLine ();
    var cursor  = highest.clone ();
    cursor.moveDown (1, false);
  }),

  new EditorKeymap.Mapping ("down", "Escape", false, false, false, false, function (store, event) {
    store.cursors.removeSecondary ();
    store.cursors.primary.removeSelection ();
  }),

  /*
   * Character Input
   */

  new EditorKeymap.Mapping ("down", function (event) {
    if (event.key.length === 1) {
    return event.key.match (/(\w|\s|[-\|\[\]{}_=+;:'@#~,<.>\/\\?\!"£$%^&*()])/g);
    } else return false;
  }, null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.insertText (event.key);
    });
  }),

  new EditorKeymap.Mapping ("down", "Backspace", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.deleteBackwards (1);
    });
  }),

  new EditorKeymap.Mapping ("down", "Delete", false, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.deleteForwards (1);
    });
  }),

  new EditorKeymap.Mapping ("down", "Enter", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.insertLine (true);
    });
  }),

  new EditorKeymap.Mapping ("down", "Tab", false, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.insertTab ();
    });
  }),

  /*
   * Clipboard Interaction
   */

  new EditorKeymap.Mapping ("down", "c", false, true, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.copySelected ();
    });
  }),

  new EditorKeymap.Mapping ("down", "x", false, true, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.copySelected (true);
    });
  }),

  new EditorKeymap.Mapping ("down", "v", false, true, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.paste ();
    });
  }),
];

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * Provides the syntax highlighting state machine.
 *
 * @constructor
 * @param {object} config The syntax configuration to load into this engine instance.
 */
var EditorSyntaxEngine = function (config) {
  /**
   * The configuration for this syntax engine
   * @type object
   * @default {}
   */
  this.config = config || {};

  /**
   * The state of the engine
   * @type number
   * @default 0
   */
  this.state  = 0;

  Object.keys (this.config).forEach (function (state_name) {
    if (this.config[state_name].rules) {
      this.config[state_name].ruleMap = this.config[state_name].rules.reduce (function (acc, rule) {
        return acc[rule.name] = rule, acc;
      }, {});
    } else {
      this.config[state_name].rules   = [];
      this.config[state_name].ruleMap = {};
    }

    if (this.config[state_name].import) {
      /* Duplicate the configuration for this state so we don't modify the original schema */
      this.config[state_name] = Object.assign ({}, this.config[state_name]);

      /* Duplicate the array of rules for this state as well */
      var rules   = this.config[state_name].rules = this.config[state_name].rules.slice (0);
      var ruleMap = this.config[state_name].ruleMap;

      this.config[state_name].import.forEach (function (impdec) {
        if (!this.config.hasOwnProperty (impdec.state)) {
          throw new Error ("Unknown state '" + impdec.state + "' in import declaration");
        }

        if (!this.config[impdec.state].ruleMap.hasOwnProperty (impdec.name)) {
          throw new Error ("Unknown rule '" + impdec.name + "' in state '" + impdec.state + "' in import declaration");
        }

        var found = this.config[impdec.state].ruleMap[impdec.name];
        ruleMap[impdec.name] = found;
        rules.push (found);

      }.bind (this));
    }
  }.bind (this));
};

/**
 * Represents a parsed syntax region with a given style and content.
 *
 * @constructor
 * @param {number} start Start of the new syntax region (column index)
 */
EditorSyntaxEngine.SyntaxRegion = function (start) {
  /**
   * The name of the style applied to this syntax region
   * @type string
   * @default null
   */
  this.style   = null;

  /**
   * The start column of this syntax region
   * @type string
   * @default 0 or the start parameter
   */
  this.start   = start || 0;

  /**
   * The end column of this syntax region
   * @type number
   * @default 0 or the start parameter
   */
  this.end     = this.start;

  /**
   * The length of this syntax region (in original characters)
   * @type number
   * @default 0
   */
  this.length  = 0;

  /**
   * The text that is contained in this syntax region.
   * @type string
   * @default ""
   */
  this.text    = "";

  /**
   * The HTML escaped version of the text contained in this syntax region.
   * @type string
   * @default ""
   */
  this.escaped = "";
};

/**
 * Escape a code point to HTML.
 *
 * @returns {string}    The HTML entity
 * @param {number} code The code point to escape
 */
EditorSyntaxEngine.SyntaxRegion.escapeCodePoint = function (code) {
  switch (code) {
    case 0x20: return "&nbsp;";
    case 0x26: return "&amp;";
    case 0x3c: return "&lt;";
    case 0x3e: return "&gt;";
    default:
      return String.fromCodePoint (code);
  }
};

/**
 * Escape a string to HTML.
 *
 * @returns {string}    The HTML escaped string
 * @param {string} str  The string to escape
 */
EditorSyntaxEngine.SyntaxRegion.escapeString = function (str) {
  const ESCAPED = { '&': "&amp;", '<': "&lt;", '>': "&gt;" };
  return str.replace (/[&<>]/g, function (c) {
    return ESCAPED[c];
  });
};

/**
 * Append a code point to this syntax region.
 *
 * This will append the given code point to this syntax region, using {@link EditorSyntaxEngine.SyntaxRegion.escapeCodePoint}.
 *
 * This method will append the original code point as a character string to the
 * `text` property, the escaped code point to the `escaped` property, and increment
 * the `length` and `end` properties.
 *
 * @param {number} code   The code point to append to this syntax region
 */
EditorSyntaxEngine.SyntaxRegion.prototype.appendCodePoint = function (code) {
  this.escaped += EditorSyntaxEngine.SyntaxRegion.escapeCodePoint (code);
  this.text    += String.fromCodePoint (code);
  this.length++;
  this.end++;
};

/**
 * Append a string to this syntax region.
 *
 * This will append the given string to this syntax region using {@link EditorSyntaxEngine.SyntaxRegion.escapeString}.
 *
 * This method will append the original string to the `text` property, the escaped
 * string to the `escaped` property, and increment the `length` and `end` properties
 * by the length of the string.
 *
 * @param {string} str    The string to append to this syntax region
 */
EditorSyntaxEngine.SyntaxRegion.prototype.appendString = function (str) {
  this.escaped += EditorSyntaxEngine.SyntaxRegion.escapeString (str);
  this.text    += str;
  this.length  += str.length;
  this.end     += str.length;
};

/**
 * Represents a collection of {@link EditorSyntaxEngine.SyntaxRegion}.
 *
 * Whilst this is mostly a wrapper around an array, a few functions are provided to append characters and
 * strings with a given style to the current `SyntaxRegion`, and automatically create a new `SyntaxRegion`
 * when the style changes.
 *
 * @example
 * var regions = new EditorSyntaxEngine.SyntaxRegionCollection ();
 * regions.appendString ("reserved_word", "return");
 * regions.appendString ("whitespace", " ");
 * regions.appendString ("number", "0x");
 * regions.appendString ("number", "123abc");
 * regions.finish ();
 *
 * // At this point the 'regions' property will contain the following regions:
 * //   { start: 0, end: 6, length: 6, style: "reserved_word", text: "return", escaped: "return" }
 * //   { start: 6, end: 7, length: 1, style: "whitespace", text: " ", escaped: "&nbsp;" }
 * //   { start: 7, end: 15, length: 8, style; "number", text: "0x123abc", escaped: "0x123abc" }
 *
 * @constructor
 */
EditorSyntaxEngine.SyntaxRegionCollection = function () {
  /**
   * The regions that have been collected up in this collection.
   * @type EditorSyntaxEngine.SyntaxRegion[]
   * @default []
   */
  this.regions = [];

  /**
   * The current region that this collection is populating.
   * @type EditorSyntaxEngine.SyntaxRegion
   */
  this.current = new EditorSyntaxEngine.SyntaxRegion ();

  /**
   * The total length of the regions within this syntax region collection.
   * @type number
   * @default 0
   */
  this.length  = 0;
};

/**
 * Save the current `SyntaxRegion` in the `current` property and create a new one.
 *
 * This method will push the current `SyntaxRegion` into the `regions` property and
 * increment the `length` property by the `length` of the current `SyntaxRegion`.
 *
 * Then it will create a new `SyntaxRegion` and assign it to the `current` property.
 * This new `SyntaxRegion` will have a start offset being the current `length` of
 * this `SyntaxRegionCollection`.
 */
EditorSyntaxEngine.SyntaxRegionCollection.prototype.saveCurrent = function () {
  this.regions.push (this.current);
  this.length += this.current.length;
  this.current = new EditorSyntaxEngine.SyntaxRegion (this.length);
};

/**
 * Finish off this syntax region collection by pusing the current `SyntaxRegion` if
 * it is not empty.
 */
EditorSyntaxEngine.SyntaxRegionCollection.prototype.finish = function () {
  if (this.current.length > 0) {
    this.saveCurrent ();
  }
};

/**
 * Given a style, either set the `style` property of the current `SyntaxRegion`
 * or save the current region (via {@link EditorSyntaxEngine.SyntaxRegionCollection#saveCurrent})
 * and set the `style` of the new `SyntaxRegion`.
 *
 * Essentially this method ensures that the given style matches the current `SyntaxRegion`
 * or it will start a new region. If the current region has not yet had a style assigned
 * to it (the `style` property is `null`) then the style is assigned to it.
 *
 * @param {string} style    The style to apply to the current (or new) syntax region
 */
EditorSyntaxEngine.SyntaxRegionCollection.prototype.saveOrSetStyle = function (style) {
  if (this.current.style === null) {
    this.current.style = style;
  } else if (this.current.style !== style) {
    this.saveCurrent ();
    this.current.style = style;
  }
};

/**
 * Append a code point to the current `SyntaxRegion` with the given style.
 *
 * @param {string} style    The style of the code point
 * @param {number} code     The code point
 * @see {@link EditorSyntaxEngine.SyntaxRegion#appendCodePoint}
 * @see {@link EditorSyntaxEngine.SyntaxRegionCollection#saveOrSetStyle}
 */
EditorSyntaxEngine.SyntaxRegionCollection.prototype.appendCodePoint = function (style, code) {
  this.saveOrSetStyle (style);
  this.current.appendCodePoint (code);
};

/**
 * Append a string to the current `SyntaxRegion` with the given style.
 *
 * @param {string} style    The style of the string
 * @param {string} str      The string to append
 * @see {@link EditorSyntaxEngine.SyntaxRegion#appendString}
 * @see {@link EditorSyntaxEngine.SyntaxRegionCollection#saveOrSetStyle}
 */
EditorSyntaxEngine.SyntaxRegionCollection.prototype.appendString = function (style, str) {
  this.saveOrSetStyle (style);
  this.current.appendString (str);
};

/**
 * Return the style name for the current state of the syntax engine.
 *
 * The various states in a syntax highlighting state machine can have an associated style. This
 * associated style is essentially the default style used when rendering elements that pass through
 * the syntax highlighter whilst it is in that state.
 *
 * @returns {string} The style for the current state of the engine (or null)
 */
EditorSyntaxEngine.prototype.getStateStyle = function () {
  return this.config[this.state].style;
};

/**
 * This function will try and match the given string to the current ruleset.
 *
 * Essentially this means taking the rules from the current state of the syntax engine and testing
 * them one-by-one until either one of them matches the given string or we reach the end of the ruleset.
 *
 * If there is a match then this method will return an object describing the match. If no rule could
 * be matched against the given string then the function will return `null`.
 *
 * When a rule is successfully matched which has a `goto` property, the state of the engine is changed
 * to that target state.
 *
 * On successful match of a rule the returned object from this method will have the following properties:
 *
 * + A `rule` property which references the rule that was successfully matched,
 * + A `length` property giving the number of characters that were matched,
 * + A `style` property that gives the style of the matched characters.
 *
 * The `style` property contains either:
 *
 * 1. The `style` property of the successfully matched rule,
 * 2. The `style` property of the current state (after possible state change), or
 * 3. The `style` property of the previous state.
 *
 * @param {string} content The text to test against the current ruleset
 * @param {number} [start] The start index into `content`
 * @returns {object}
 */
EditorSyntaxEngine.prototype.match = function (content, start) {
  var str   = start ? content.substring (start) : content;
  var state = this.config[this.state];

  for (var i = 0; i < state.rules.length; i++) {
    const rule = state.rules[i];
    const res  = rule.expr.exec (str);

    if (res) {
      /* If we have a 'goto' instruction, then set our new state */
      if (typeof rule.goto === "number") {
        this.state = rule.goto;
      }

      /* The style to apply is either the direct rule 'style' property or the 'style' property of our (possibly new) state */
      return { style: rule.style || this.config[this.state].style || state.style, rule: rule, length: res[0].length };
    }
  }

  return null;
};

/**
 * Match the end of a line.
 *
 * Certain states match against the end of the line (those with a `$eol` property). This method
 * will check whether there is a `$eol` property in the current state, and if so it will change
 * to the target state.
 */
EditorSyntaxEngine.prototype.matchEOL = function () {
  var state = this.config[this.state];
  if (state.hasOwnProperty ("$eol")) {
    this.state = state["$eol"];
  }
};

/**
 * Perform syntax highlighting for a single line.
 *
 * @example
 * var engine = new EditorSyntaxEngine (EditorSyntaxEngine.JavaScript);
 * var result = engine.hightlightLine ("return true", 0);
 *
 * @param {string} line          The line that we are to syntax highlight
 * @param {number} [start_state] The initial state for the line (default to current state)
 * @param {number} [tab_size]    The size to which tabs should be expanded (default: 2)
 * @returns {EditorSyntaxEngine.SyntaxRegionCollection}
 */
EditorSyntaxEngine.prototype.highlightLine = function (line, start_state, tab_size) {
  /* Initialize at the start state (or original state) */
  this.state = start_state || this.state;

  /* Make sure that the tab size is sane; fall back to the default config */
  tab_size = tab_size || EditorStore.defaultConfig.tabSize;

  const length     = line.length;
  var   regions    = new EditorSyntaxEngine.SyntaxRegionCollection ();
  var   last_index = 0;

  while (last_index < length) {
    const char = line[last_index];
    const code = char.codePointAt (0);

    if (code === 0x09) { /* tab */
      for (var t = 0; t < tab_size; t++) {
        regions.appendCodePoint ("whitespace", 0x20);
      }

      last_index++;
    } else if (/\s/.test (char)) {
      regions.appendCodePoint ("whitespace", code);
      last_index++;
    } else {
      var result = this.match (line, last_index);
      if (result) {
        regions.appendString (result.style, line.substring (last_index, last_index + result.length));
        last_index += result.length;
      } else {
        regions.appendCodePoint (this.getStateStyle () || "plain", code);
        last_index++;
      }
    }
  }

  regions.finish ();
  this.matchEOL ();

  return regions;
};

/**
 * Perform syntax highlighting over the given set of lines.
 *
 * This method will run the syntax highlighting engine of the given set of lines and
 * return an array of arrays of {@link EditorSyntaxEngine.SyntaxRegion}. Each element
 * of the array corresponds to a line, and each sub-element describes a syntax region.
 *
 * @example
 * var engine = new EditorSyntaxEngine (EditorSyntaxEngine.JavaScript);
 * var lines  = [ "function foo () {", "  return true;", "}" ];
 * var result = engine.highlightLines (lines, 0);
 *
 * @param {string[]} lines         Array of lines to syntax highlight
 * @param {number}   [start_state] The start state for the engine (default: to current state)
 * @param {number}   [tab_size]    The size to which tabs should be expanded (default: 2)
 * @returns {EditorSyntaxEngine.SyntaxRegion[][]}
 */
EditorSyntaxEngine.prototype.highlightLines = function (lines, start_state, tab_size) {
  /* Initialise at the start state (or original satte) */
  this.state = start_state || this.state;

  /* Make sure that the tab size is sane; fallback to the default config */
  tab_size = tab_size || EditorStore.defaultConfig.tabSize;

  var regions = [];
  for (var i = 0; i < lines.length; i++) {
    regions.push (this.highlightLine (lines[i], null, tab_size).regions);
  }

  return regions;
};

/**
 * A syntax defintion for the JavaScript language.
 *
 * @example
 * var engine = new EditorSyntaxEngine (EditorSyntaxEngine.JavaScript);
 */
EditorSyntaxEngine.JavaScript = {
  /* no state */
  0: {
    style: null,
    rules: [
      {
        name:  "line_comment_start",
        expr:  /^\/\//,
        goto:  1
      },

      {
        name:  "block_comment_start",
        expr:  /^\/\*/,
        goto:  2
      },

      {
        name:  "string_literal_start",
        expr:  /^["]/,
        goto:  3
      },

      {
        name:  "char_literal_start",
        expr:  /^[']/,
        goto:  4
      },

      {
        name:  "reserved_word",
        expr:  /^(var|function|new|this|typeof|true|false|null|prototype|return|try|catch|if|else|for(all)?|continue|break|throw|switch|case|default|while|do|instanceof|const)\b/,
        style: "reserved_word"
      },

      {
        name:  "type_name",
        expr:  /^[A-Z][a-zA-Z0-9_]*/,
        style: "type_name"
      },

      {
        name:  "identifier",
        expr:  /^[_a-z][a-zA-Z0-9_]*/,
        style: "identifier"
      },

      {
        name:  "hexadecimal",
        expr:  /^0[xX][0-9a-fA-F]*/,
        style: "number"
      },

      {
        name:  "decimal",
        expr:  /^[0-9]+(\.[0-9]*)?/,
        style: "number"
      },

      {
        name:  "regexp",
        expr:  /^\/.*\/[gimuy]*/,
        style: "regexp"
      }
    ]
  },

  /* line comment */
  1: {
    style: "comment",
    $eol:  0
  },

  /* block comment */
  2: {
    style: "comment",
    rules: [
      {
        name:  "block_comment_end",
        expr:  /^\*\//,
        style: "comment",
        goto:  0
      }
    ]
  },

  /* string literal */
  3: {
    style: "string_literal",
    rules: [
      {
        name:  "string_literal_escape",
        expr:  /^\\([\\'"bfnrtv0]|(?:[1-7][0-7]{0,2}|[0-7]{2,3})|(?:x[a-fA-F0-9]{2})|(?:u[a-fA-F0-9]{4}))/,
        style: "string_literal_escape"
      },

      {
        name: "string_literal_end",
        expr: /^["]/,
        goto: 0
      }
    ]
  },

  /* character literal */
  4: {
    style: "string_literal",
    rules: [
      {
        name: "char_literal_end",
        expr: /^[']/,
        goto: 0
      }
    ],

    import: [
      { state: 3, name: "string_literal_escape" },
    ]
  }
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * @constructor
 * @param {EditorStore} store The store to which this indent ranges collection belongs
 */
var EditorIndentRanges = function (store) {
  this.store  = store;
  this.ranges = [];

  this.Changed = new EditorEvent ("EditorIndentRanges.Changed");
  this.update ();
};

/**
 *
 */
EditorIndentRanges.prototype.update = function () {
  var store  = this.store;
  var ranges = [];

  this.store.lines.forEach (function (line) {
    if (line.indent > 0) {
      var index = line.indent / store.config.tabSize;

      for (var column = 0; column < index; column++) {
        if (column > ranges.length - 1) {
          ranges.push ([{ start: line.index, end: line.index }]);
        } else {
          var blocks = ranges[column];
          var block  = blocks[blocks.length - 1];

          if (block.end === line.index - 1) {
            /* Previous line was indented at this column; extend the block */
            block.end = line.index;
          } else {
            /* Previous line was not indented at this column; create a new block */
            blocks.push ({ start: line.index, end: line.index });
          }
        }
      }
    } else if (line.content.length === 0 || line.contains (/^\s*$/)) {
      /* Extend all blocks from previous line through this blank line */
      ranges.forEach (function (blocks) {
        var last_block = blocks[blocks.length - 1];
        if (last_block.end === line.index - 1) {
          last_block.end = line.index;
        }
      });
    }
  });

  this.ranges = ranges;
};

/**
 *
 */
EditorIndentRanges.prototype.onChanged = function () {
  this.Changed.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * @constructor
 * @param {object} [config]  The configuration for this editor store
 * @param {string} [initial] The initial content of the editor
 */
var EditorStore = function (config, initial) {
  /**
   * The scroll position has changed
   * @event EditorStore#Scroll
   * @type {EditorEvent}
   * @param {number} scroll_top The new top scroll value
   */
  this.Scroll             = new EditorEvent ("EditorStore.Scroll");

  /**
   * A cursor has changed
   * @event EditorStore#CursorChanged
   * @type {EditorEvent}
   * @param {EditorCursor} cursor The cursor that has changed
   */
  this.CursorChanged      = new EditorEvent ("EditorStore.CursorChanged");

  /**
   * The lines in the store have changed
   * @event EditorStore#LinesChanged
   * @type {EditorEvent}
   */
  this.LinesChanged       = new EditorEvent ("EditorStore.LinesChanged");

  /**
   * The height of a line (held in the `lineHeight` property) has changed
   * @event EditorStore#LineHeightChanged
   * @type {EditorEvent}
   */
  this.LineHeightChanged  = new EditorEvent ("EditorStore.LineHeightChanged");

  /**
   * The width of a character (held in the `charWidth` property) has changed
   * @event EditorStore#CharWidthChanged
   * @type {EditorEvent}
   */
  this.CharWidthChanged   = new EditorEvent ("EditorStore.CharWidthChanged");

  /**
   * The content of a line has changed
   * @event EditorStore#LineContentChanged
   * @type {EditorEvent}
   * @param {EditorLine} line The line that has changed it's content
   */
  this.LineContentChanged = new EditorEvent ("EditorStore.LineContentChanged");

  /**
   * The active line has changed (held in the `activeLine` property)
   * @event EditorStore#ActiveLineChanged
   * @type {EditorEvent}
   * @param {number} prev The previous active line
   * @param {number} next The new active line
   */
  this.ActiveLineChanged  = new EditorEvent ("EditorStore.ActiveLineChanged");

  this.config       = Object.assign ({}, EditorStore.defaultConfig, config);
  this.keymap       = new EditorKeymap (this, this.config.keymap);
  this.lines        = [];
  this.activeLine   = 0;
  this.cursors      = new EditorCursorCollection (this);
  this.lineHeight   = 0;
  this.charWidth    = 0;
  this.scrollTop    = 0;
  this.viewHeight   = 0;
  this.nextLineId   = new EditorIdGenerator ();
  this.indentRanges = new EditorIndentRanges (this);
  this.syntaxEngine = this.config.syntax ? new EditorSyntaxEngine (this.config.syntax) : null;
  this.editorTheme  = new EditorThemeColors ();
  this.loading      = false;

  this.deserialize (initial);
};

/**
 * Default configuration
 */
EditorStore.defaultConfig = {
  lineNumbers:        true,
  minLineNumberChars: 2,
  gutter:             true,
  minimap:            true,
  keymap:             EditorKeymap.defaultKeymap,
  mountFocused:       false,
  tabSize:            2,
  softTabs:           true,
  syntax:             EditorSyntaxEngine.JavaScript
};

/**
 * Get the next line ID
 */
EditorStore.prototype.getNextLineId = function () {
  return this.nextLineId++;
};

/**
 * Deserialize the argument string into the editor
 */
EditorStore.prototype.deserialize = function (obj) {
  this.loading = true;

  if (typeof obj === "string") {
    this.lines = obj.split (/[\r\n]/).map (function (line, index) {
      return new EditorLine (this, index, line, true);
    }.bind (this));
  }

  /* Make sure we have at least one line */
  if (this.lines.length === 0) {
    this.lines.push (new EditorLine (this, 0, ""));
  } else {
    this.lines.forEach (function (line) {
      if (line.elements.length === 0) {
        line.updateIndent ();
        line.computeRender ();
      }
    });
  }

  this.loading = false;
  this.indentRanges.update ();
};

/**
 * Get the contents of the editor as a string.
 */
EditorStore.prototype.getText = function () {
  return this.lines.map (function (line) {
    return line.content;
  }).join ('\n');
};

/**
 * Set the content of the editor to a new string.
 *
 * @param {string} text The new content of the editor
 */
EditorStore.prototype.setText = function (text) {
  /* Remove the secondary cursors and cancel any remaining selection */
  this.cursors.removeSecondary ();
  this.cursors.primary.removeSelection ();

  /* Move the primary cursor to 0 position */
  this.cursors.primary.setLocation ({ line: 0, column: 0 });

  /* Create the new lines */
  this.lines = obj.split (/[\r\n]/).map (function (line, index) {
    return new EditorLine (this, index, line, false);
  }.bind (this));

  /* Make sure we have at least one line */
  if (this.lines.length === 0) {
    this.lines.push (new EditorLine (this, 0, ""));
  } else {
    this.lines.forEach (function (line) {
      line.updateIndent ();
      line.computeRender ();
    });
  }

  /* Notify the UI that the lines have changed */
  this.onLinesChanged ();
};

/**
 * Renumerate the lines so that their indices are correct.
 */
EditorStore.prototype.renumerateLines = function () {
  this.lines.forEach (function (line, index) {
    line.index = index;
  });
};

/**
 * Insert a new line into the store at the given index.
 *
 * @param {number} index The index at which to insert the new line
 * @param {EidtorLine} line The line to insert at the given index
 */
EditorStore.prototype.insertLine = function (index, line) {
  this.lines.splice (index, 0, line);
  this.renumerateLines ();
  this.onLinesChanged ();
};

/**
 * Delete a line at the given index from the store.
 *
 * @param {number} index The index of the line to delete
 */
EditorStore.prototype.deleteLine = function (index) {
  this.lines.splice (index, 1);
  this.renumerateLines ();
  this.onLinesChanged ();
};

/**
 * Test if the given index is a valid line index.
 *
 * @param {number} index The index to test
 */
EditorStore.prototype.isValidLineIndex = function (index) {
  return index >= 0 && index < this.lines.length;
};

/**
 * Get the maximum number of lines (i.e. maximum line number).
 */
EditorStore.prototype.getMaxLineNumber = function () {
  return this.lines.length;
};

/**
 * Work out how many characters it would take to render the maximum line number,
 * taking into account the minimum line number characters in the options.
 *
 * That is, given 1000 lines, we would return 4 (it'll take four characters
 * to render the maximum line number).
 *
 * Additionally, given five lines but a `minLineNumberChars` option set to
 * two, we would return two (it'll only take one character to render the maximum
 * line number but the configuration has set the minimum to two).
 */
EditorStore.prototype.getLineNumberCharWidth = function () {
  return Math.max (this.config.minLineNumberChars, 1 + Math.floor (Math.log10 (this.getMaxLineNumber ())));
};

/**
 * Work out the offset (in characters) from the left of the editor container
 * to the actual editor content, taking into account the line numbers and
 * gutter.
 */
EditorStore.prototype.getLeftOffsetChars = function () {
  var with_gutter = this.config.gutter ? 1 : 0;
  if (this.config.lineNumbers) {
    return with_gutter + this.getLineNumberCharWidth ();
  } return with_gutter;
};

/**
 * Set the line height for the editor (usually inferred from analysis of the DOM).
 *
 * @param {number} height The new line height
 */
EditorStore.prototype.setLineHeight = function (height) {
  if (this.lineHeight !== height) {
    this.lineHeight = height;
    this.onLineHeightChanged ();
  }
};

/**
 * Set the character width for the editor (usually inferred from analysis of the DOM).
 *
 * @param {number} width The new character width
 */
EditorStore.prototype.setCharWidth = function (width) {
  if (this.charWidth != width) {
    this.charWidth = width;
    this.onCharWidthChanged ();
  }
};

/**
 * Set the height of the view.
 *
 * @param {number} height The new view height
 */
EditorStore.prototype.setViewHeight = function (height) {
  this.viewHeight = height;
};

/**
 * Given a client offset in pixels relative to the top-left of the view, return the
 * equivalent character position (as a {@link EditorPosition}).
 *
 * @param {number} left The left offset (in pixels)
 * @param {number} top  The top offset (in pixels)
 * @returns {EditorPosition} Closest character position
 */
EditorStore.prototype.clientToIndices = function (left, top) {
  return new EditorPosition (Math.floor (top / this.lineHeight), Math.round (left / this.charWidth));
};

/**
 * Given an {@link EditorPosition}, convert the character position into a client
 * position (in pixels) relative to the top-left of the view.
 *
 * @param {EditorPosition} location The character location
 * @return {object} The left and top client position (in pixels)
 */
EditorStore.prototype.indicesToClient = function (location) {
  var result = { left: 0, top: 0 };

  result.left = location.column * this.charWidth;
  result.top  = location.line * this.lineHeight;
  return result;
};

/**
 * Set the primary cursor location to the given {@link EditorPosition}.
 *
 * This will remove any secondary cursors (see {@link EditorCursorCollection#removeSecondary})
 * and set the location of the primary cursor (see {@link EditorCursor#setLocation}).
 *
 * @param {EditorPosition} location The new primary cursor location
 */
EditorStore.prototype.setCursorLocation = function (location) {
  this.cursors.removeSecondary ();
  this.cursors.primary.setLocation (location);
};

/**
 * Get the index of the top-most visible line for the current scroll position
 * and height of a line.
 *
 * @returns {number} The index of the top-most visible line
 */
EditorStore.prototype.getScrollTopLine = function () {
  return Math.min (this.lines.length - 1, Math.max (0, Math.floor (this.scrollTop / this.lineHeight)));
};

/**
 * Get the index of the bottom-most visible line for the current scroll position,
 * line height and view height.
 *
 * @returns {number} The index of the bottom-most visible line
 */
EditorStore.prototype.getScrollBottomLine = function () {
  return this.getScrollTopLine () + Math.ceil (this.viewHeight / this.lineHeight);
};

/**
 * Scroll to the line with the given index (see {@link EditorStore#onScroll}).
 *
 * Optionally this will center the view on the line at the given index.
 *
 * @param {number}  line     The index of the target line
 * @param {boolean} [center] Whether to center the view on the given line
 */
EditorStore.prototype.scrollToLine = function (line, center) {
  const offset = line * this.lineHeight;
  if (center) {
    this.onScroll (offset - this.viewHeight / 2, true);
  } else {
    this.onScroll (offset, true);
  }
};

/**
 * Search through all the lines in the store to find the first line that contains
 * the given string or regular expression (see {@link EditorLine#contains}).
 *
 * @param {string|RegExp} what The value to search for
 * @returns {number} The index of the first line that contains the given search (or `-1`).
 */
EditorStore.prototype.findLineContains = function (what) {
  for (var i = 0; i < this.lines.length; i++) {
    if (this.lines[i].contains (what)) {
      return i;
    }
  }

  return -1;
};

/**
 * Extract the content from the store for the given selection.
 * @param {EditorSelection} selection The selection to extract
 */
EditorStore.prototype.acquireSelectionContent = function (selection) {
  const region  = selection.region;
  var   content = [];

  for (var i = region.start_line; i <= region.end_line; i++) {
    const line  = this.lines[i];
    const start = i === region.start_line ? region.start_column : 0;
    const end   = i === region.end_line ? region.end_column : line.getLength ();
    content.push (line.content.substring (start, end));
  }

  return content;
};

EditorStore.prototype.removeSelection = function (selection) {
  const region       = selection.region;
  var   start_col    = region.start_column;
  var   remove_start = -1;
  var   remove_end   = -1;

  for (var i = region.start_line; i <= region.end_line; i++) {
    const line    = this.lines[i];
    const end_col = i === region.end_line ? region.end_column : line.getLength ();

    if (start_col === 0 && end_col === line.getLength ()) {
      /* The entire line is encompassed by the selection */
      if (remove_start === -1) {
        remove_start = i;
      }

      remove_end = Math.max (remove_end, i);
    } else {
      /* Only part of the line is encompassed by the selection */
      line.deleteText (start_col, end_col - start_col);
    }

    /* Subsequent selected lines start at first column */
    start_col = 0;
  }

  /* Remove the lines that we marked for removal */
  if (remove_start !== -1) {
    this.lines.splice (remove_start, (remove_end - remove_start) + 1);

    const target = this.lines[region.start_line];
    const source = this.lines[region.start_line + 1];
    target.appendText (source.content);
    this.lines.splice (region.start_line + 1, 1);

    this.renumerateLines ();
    this.onLinesChanged ();
  }
};

/**
 * When scrolling takes place (or we need to scroll to a position) this method
 * is called to update the `scrollTop` property of the store and fire the
 * {@link EditorStore#event:Scroll} event.
 *
 * @param {number} scrollTop The new scroll position
 * @param {boolean} clamp_to_line Whether to clamp the position to a line
 * @fires EditorStore#Scroll
 */
EditorStore.prototype.onScroll = function (scrollTop, clamp_to_line) {
  this.scrollTop = Math.max (0, scrollTop);

  if (clamp_to_line) {
    this.scrollTop = Math.round (this.scrollTop / this.lineHeight) * this.lineHeight;
  }

  this.Scroll.fire (this.scrollTop);
};

/**
 * When a cursor has changed this method is called by the cursor (see the
 * {@link EditorCursor#onChanged} method for the most common call site).
 *
 * This method will first touch the blink timer in the {@link EditorCursorCollection}
 * to make sure that all the cursors are visible (via {@link EditorCursorCollection#startBlink}).
 * After which it will fire the {@link EditorStore#event:CursorChanged} with
 * the argument given to this method.
 *
 * If the cursor that has changed is the primary cursor, and it has changed
 * it's position away from the `activeLine` property then the `activeLine`
 * property is updated with the `line` property of the `position` property
 * of the primary cursor (setting `activeLine` to the primary cursor). This
 * will cause the {@link EditorStore#event:ActiveLineChanged} event to be
 * fired with the previous value of the `activeLine` property and the new line.
 *
 * If the primary cursors was changed so that it's line position is before the
 * top-most visible line (see {@link EditorStore#getScrollTopLine}) then the
 * {@link EditorStore#onScroll} method is called to move the new line position
 * of the primary cursor into view.
 *
 * If the primary cursor was changed so that it's line position is after the
 * bottom-most visible line (see {@link EditorStore#getScrollBottomLine}) then
 * the {@link EditorStore#onScroll} method is called to move the new line
 * position of the primary cursor into view.
 *
 * @param {EditorCursor} cursor The cursor which underwent a change
 *
 * @fires EditorCursorCollection#Blink
 * @fires EditorStore#CursorChanged
 * @fires EditorStore#ActiveLineChanged
 * @fires EditorStore#Scroll
 */
EditorStore.prototype.onCursorChanged = function (cursor) {
  this.cursors.startBlink (true);
  this.CursorChanged.fire (cursor);

  if (cursor === this.cursors.primary) {
    if (this.activeLine !== cursor.position.line) {
      var prev = this.activeLine;
      this.activeLine = cursor.position.line;
      this.ActiveLineChanged.fire (prev, cursor.position.line);
    }

    if (cursor.position.line <= this.getScrollTopLine ()) {
      this.onScroll (cursor.position.line * this.lineHeight);
    } else if (cursor.position.line >= this.getScrollBottomLine ()) {
      this.onScroll ((cursor.position.line + 1) * this.lineHeight - this.viewHeight);
    }
  }
};

/**
 * Fire the {@link EditorStore#event:LinesChanged} event and call the
 * {@link EditorIndentRanges#update} method on the `indentRanges` property
 * to update the indentation range blocks.
 *
 * @fires EditorStore#LinesChanged
 */
EditorStore.prototype.onLinesChanged = function () {
  this.LinesChanged.fire ();
  this.indentRanges.update ();
};

/**
 * Fire the {@link EditorStore#event:LineHeightChanged} event.
 * @fires EditorStore#LineHeightChanged
 */
EditorStore.prototype.onLineHeightChanged = function () {
  this.LineHeightChanged.fire ();
};

/**
 * Fires the {@link EditorStore#event:CharWidthChanged} event.
 * @fires EditorStore#CharWidthChanged
 */
EditorStore.prototype.onCharWidthChanged = function () {
  this.CharWidthChanged.fire ();
};

/**
 * Fires the {@link EditorStore#event:LineContentChanged} event and calls
 * the {@link EditorIndentRanges#update} method on the `indentRanges` property
 * to update the indentation range blocks.
 *
 * The {@link EditorStore#event:LineContentChanged} event is passed the
 * {@link EditorLine} argument from this method.
 *
 * @param {EditorLine} line The line who's content was changed
 */
EditorStore.prototype.onLineContentChanged = function (line) {
  this.LineContentChanged.fire (line);
  if (!this.loading) {
    this.indentRanges.update ();
  }
};

/* --------------------------------------------------------------------------------------------------------------------------- */
/* -- REACT COMPONENTS                                                                                                         */
/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorRenderLineNumbers = React.createClass ({
  propTypes: {
    store: React.PropTypes.instanceOf (EditorStore).isRequired
  },

  onLinesChanged: function () {
    if (this.props.store.config.lineNumbers) {
      this.computeLineString ();
    }

    this.forceUpdate ();
  },

  computeLineString: function () {
    var total   = this.props.store.lines.length + 1;
    var builder = new Array (2 * total);

    for (var i = 1, j = 0; i < total; i++, j += 2) {
      builder[j + 0] = String (i);
      builder[j + 1] = "<br />";
    }

    this.lineString = builder.join ('');
  },

  componentWillMount: function () {
    if (this.props.store.config.lineNumbers) {
      this.computeLineString ();
    }
  },

  componentDidMount: function () {
    this.props.store.LinesChanged.bindTo (this, this.onLinesChanged);
  },

  componentWillUnmount: function () {
    this.props.store.Scroll.unbindFrom (this);
    this.props.store.LinesChanged.unbindFrom (this);
  },

  render: function () {
    const store = this.props.store;
    if (store.config.lineNumbers) {
      const width = store.getLineNumberCharWidth ();
      return <div ref="lines" className="line-numbers" style={{ width: width + "em" }} dangerouslySetInnerHTML={{ __html: this.lineString }} />;
    } else {
      return null;
    }
  }
});

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorRenderGutterMarker = React.createClass ({
  propTypes: {
    marker: React.PropTypes.instanceOf (EditorLineMarker)
  },

  render: function () {
    return <span>M</span>;
  }
});

var EditorRenderGutter = React.createClass ({
  propTypes: {
    store: React.PropTypes.instanceOf (EditorStore).isRequired
  },

  onLinesChanged: function () {
    this.forceUpdate ();
  },

  onDimensionsChanged: function () {
    this.forceUpdate ();
  },

  componentDidMount: function () {
    this.props.store.LinesChanged.bindTo (this, this.onLinesChanged);
    this.props.store.LineHeightChanged.bindTo (this, this.onDimensionsChanged);
    this.props.store.CharWidthChanged.bindTo (this, this.onDimensionsChanged);
  },

  componentWillUnmount: function () {
    this.props.store.LinesChanged.unbindFrom (this);
    this.props.store.LineHeightChanged.unbindFrom (this);
    this.props.store.CharWidthChanged.unbindFrom (this);
  },

  render: function () {
    const store = this.props.store;

    if (store.config.gutter) {
      const width    = store.config.lineNumbers ? store.getLineNumberCharWidth () : 0;
      const elements = store.lines.map (function (line, index) {
        if (line.marker) {
          return <div key={index}><EditorRenderGutterMarker marker={line.marker} /></div>;
        } else {
          return null;
        }
      });

      return <div ref="gutter" className="gutter" style={{ left: width + "em", height: store.lines.length * store.lineHeight }}>{elements}</div>;
    } else {
      return null;
    }
  }
});

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorRenderCursor = React.createClass ({
  propTypes: {
    cursor: React.PropTypes.instanceOf (EditorCursor).isRequired
  },

  onCursorChanged: function (cursor) {
    this.forceUpdate ();
  },

  onDimensionsChanged: function () {
    this.forceUpdate ();
  },

  onBlinkChanged: function (index) {
    this.refs.cursor.style.visibility = index ? "visible" : "hidden";
  },

  componentDidMount: function () {
    this.props.cursor.Changed.bindTo (this, this.onCursorChanged);
    this.props.cursor.store.LineHeightChanged.bindTo (this, this.onDimensionsChanged);
    this.props.cursor.store.CharWidthChanged.bindTo (this, this.onDimensionsChanged);
    this.props.cursor.store.cursors.Blink.bindTo (this, this.onBlinkChanged);
  },

  componentWillUnmount: function () {
    this.props.cursor.Changed.unbindFrom (this);
    this.props.cursor.store.LineHeightChanged.unbindFrom (this);
    this.props.cursor.store.CharWidthChanged.unbindFrom (this);
    this.props.cursor.store.cursors.Blink.unbindFrom (this);
  },

  render: function () {
    const cursor  = this.props.cursor;
    const client  = cursor.store.indicesToClient (cursor.position);
    var   classes = {
      "cursor":       true,
      "secondary":    !cursor.primary
    }

    /* Make sure the initial visibility of a cursor corresponds to all others */
    client.visibility = cursor.store.cursors.blinkIndex ? "visible" : "hidden";
    client.height     = cursor.store.lineHeight;
    return <div ref="cursor" className={EditorTools.joinClasses (classes)} style={client} />;
  }
});

var EditorRenderCursorSelection = React.createClass ({
  propTypes: {
    cursor: React.PropTypes.instanceOf (EditorCursor).isRequired
  },

  computeLineBlocks: function () {
    const cursor     = this.props.cursor;
    const store      = cursor.store;
    const lineHeight = store.lineHeight;
    const charWidth  = store.charWidth;
    const selection  = cursor.selection.region;

    this.selection_blocks = [];
    for (var i = selection.start_line; i <= selection.end_line; i++) {
      const line  = store.lines[i];
      const left  = i === selection.start_line ? selection.start_column : 0;
      const right = i === selection.end_line ? selection.end_column : line.getLength ();

      this.selection_blocks.push ({
        top:    i * lineHeight,
        left:   left * charWidth,
        width:  (right - left) * charWidth,
        height: lineHeight + 1
      });
    }
  },

  onSelectionChanged: function () {
    console.log ("EditorRenderCursorSelection.onSelectionChanged", this.props.cursor.primary);
    this.computeLineBlocks ();
    this.forceUpdate ();
  },

  componentWillMount: function () {
    this.computeLineBlocks ();
  },

  componentDidMount: function () {
    this.props.cursor.SelectionChanged.bindTo (this, this.onSelectionChanged);
  },

  componentWillUnmount: function () {
    this.props.cursor.SelectionChanged.unbindFrom (this);
  },

  render: function () {
    const blocks = this.selection_blocks.map (function (block, index) {
      return <div key={index} className="selection-block" style={block}></div>;
    });

    return (
      <div>
        {blocks}
      </div>
    );
  }
});

var EditorRenderCursorContainer = React.createClass ({
  propTypes: {
    cursors: React.PropTypes.instanceOf (EditorCursorCollection).isRequired
  },

  onCursorsChanged: function () {
    this.forceUpdate ();
  },

  componentDidMount: function () {
    this.props.cursors.CursorAdded.bindTo (this, this.onCursorsChanged);
    this.props.cursors.CursorRemoved.bindTo (this, this.onCursorsChanged);
    this.props.cursors.primary.Changed.bindTo (this, this.onCursorsChanged);
  },

  componentWillUnmount: function () {
    this.props.cursors.CursorAdded.unbindFrom (this);
    this.props.cursors.CursorRemoved.unbindFrom (this);
    this.props.cursors.primary.Changed.unbindFrom (this);
  },

  render: function () {
    const store      = this.props.cursors.store;
    const selections = this.props.cursors.map (function (cursor, index) {
      if (cursor.selection) {
        return <EditorRenderCursorSelection key={index} cursor={cursor} />;
      } else return null;
    });

    const cursors = this.props.cursors.map (function (cursor, index){
      return <EditorRenderCursor key={index} cursor={cursor} />;
    });

    const encapsulator_style = { width: store.charWidth, height: store.lineHeight };
    const encapsulators = this.props.cursors.map (function (cursor, index) {
      var offset = cursor.getEncapsulatorOffset ();

      if (offset !== null) {
        var style = Object.assign ({}, encapsulator_style, { marginLeft: (offset * store.charWidth) }, store.indicesToClient (cursor.position));
        return <div key={index} className="encapsulator-marker" style={style} />;
      } else return null;
    });

    const alt_encapsulators = this.props.cursors.map (function (cursor, index) {
      var matching = cursor.getMatchingEncapsulator ();
      if (matching !== null) {
        var style = Object.assign ({}, encapsulator_style, store.indicesToClient (matching));
        return <div key={'alt_' + index} className="encapsulator-marker matching" style={style} />;
      } else return null;
    });

    return (
      <div className="cursors">
        {selections}
        {cursors}
        {encapsulators}
        {alt_encapsulators}
      </div>
    );
  }
});

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorRenderLine = React.createClass ({
  propTypes: {
    line: React.PropTypes.instanceOf (EditorLine).isRequired
  },

  onContentChanged: function () {
    this.forceUpdate ();
  },

  onActiveLineChanged: function (prev, next) {
    if (prev === next) return;

    var element = this.refs.line;
    if (prev === this.props.line.index) {
      element.className = element.className.replace (/\scurrent-line/g, '');
    } else if (next === this.props.line.index) {
      element.className += " current-line";
    }
  },

  componentDidMount: function () {
    this.props.line.ContentChanged.bindTo (this, this.onContentChanged);
    this.props.line.store.ActiveLineChanged.bindTo (this, this.onActiveLineChanged);
  },

  componentWillUnmount: function () {
    this.props.line.ContentChanged.unbindFrom (this);
    this.props.line.store.ActiveLineChanged.unbindFrom (this);
  },

  render: function () {
    const line       = this.props.line;
    const lineHeight = line.store.lineHeight;
    const primary    = line.store.cursors.primary;
    const className  = {
      "line":         true,
      "current-line": line.index === primary.line
    };

    return (
      <div ref="line"
           className={EditorTools.joinClasses (className)}
           style={{ top: line.index * lineHeight, height: lineHeight }}
           dangerouslySetInnerHTML={{ __html: line.render }} />
    );
  }
});

var EditorRenderIndentRanges = React.createClass ({
  propTypes: {
    ranges: React.PropTypes.instanceOf (EditorIndentRanges).isRequired
  },

  onRangesChanged: function () {
    this.forceUpdate ();
  },

  onDimensionsChanged: function () {
    this.forceUpdate ();
  },

  componentDidMount: function () {
    this.props.ranges.Changed.bindTo (this, this.onRangesChanged);
    this.props.ranges.store.CharWidthChanged.bindTo (this, this.onDimensionsChanged);
    this.props.ranges.store.LineHeightChanged.bindTo (this, this.onDimensionsChanged);
  },

  componentWillUnmount: function () {
    this.props.ranges.Changed.unbindFrom (this);
    this.props.ranges.store.CharWidthChanged.unbindFrom (this);
    this.props.ranges.store.LineHeightChanged.unbindFrom (this);
  },

  render: function () {
    const store     = this.props.ranges.store;
    const tab_size  = store.config.tabSize;
    const ranges    = this.props.ranges.ranges;
    const last_line = store.getScrollBottomLine ();
    const columns   = ranges.map (function (range, column) {
      const left    = column * tab_size * store.charWidth;
      const blocks  = range.filter (function (block) {
        return block.start <= last_line;
      }).map (function (block, index) {
        return <div key={index} style={{ left: left, top: block.start * store.lineHeight, height: (1 + (block.end - block.start)) * store.lineHeight }}/>;
      });

      return <div key={column}>{blocks}</div>;
    });

    return <div className="indent-indicator-ranges">{columns}</div>;
  }
});

var EditorRenderLines = React.createClass ({
  propTypes: {
    store: React.PropTypes.instanceOf (EditorStore).isRequired
  },

  getClickLocation: function (event) {
    const lines       = this.refs.lines;
    const client_rect = lines.getBoundingClientRect ();
    const top         = (event.clientY - client_rect.top) + lines.scrollTop;
    const left        = (event.clientX - client_rect.left) + lines.scrollLeft;

    return this.props.store.clientToIndices (left, top);
  },

  onViewClick: function (event) {
    const store    = this.props.store;
    const cursors  = store.cursors;
    const location = this.getClickLocation (event);

    cursors.removeSecondary ();

    if (this.tripleTimeout) {
      window.clearTimeout (this.tripleTimeout);
      this.tripleTimeout = null;

      const line = store.lines[location.line];
      if (line) {
        cursors.primary.selectLine (line);
      }
    } else {
      cursors.primary.removeSelection ();
      cursors.primary.setLocation (location, event.shiftKey);
    }
  },

  onViewDoubleClick: function (event) {
    if (this.tripleTimeout) {
      window.clearTimeout (this.tripleTimeout);
      this.tripleTimeout = null;
    }

    this.tripleTimeout = window.setTimeout (function () {
      this.tripleTimeout = null;
    }.bind (this), 300);
  },

  onViewTripleClicked: function (event) {
    const location = this.getClickLocation (event);
    const line     = store.lines[location.line];

    if (line) {
      store.cursors.removeSecondary ();
      store.cursors.primary.selectLine (line);
    }
  },

  onCharDimensionsChanged: function () {
    this.forceUpdate ();
  },

  onLinesChanged: function () {
    this.forceUpdate ();
  },

  onScroll: function (scrollTop) {
    this.forceUpdate ();
  },

  componentDidMount: function () {
    this.props.store.editorTheme.extractFromDOM (this.refs.lines);
    this.props.store.CharWidthChanged.bindTo (this, this.onCharDimensionsChanged);
    this.props.store.LinesChanged.bindTo (this, this.onLinesChanged);
    this.props.store.Scroll.bindTo (this, this.onScroll);
  },

  componentWillUnmount: function () {
    this.props.store.CharWidthChanged.unbindFrom (this);
    this.props.store.LinesChanged.unbindFrom (this);
    this.props.store.Scroll.unbindFrom (this);
  },

  render: function () {
    const store       = this.props.store;
    const right       = store.config.minimap ? 100 : 0;
    const left_offset = store.getLeftOffsetChars ();
    const first_line  = store.getScrollTopLine ();
    const last_line   = store.getScrollBottomLine ();
    const lines       = store.lines.filter (function (line) {
      return line.index >= first_line && line.index <= last_line;
    }).map (function (line, index) {
      return <EditorRenderLine key={line.id} line={line} />;
    });

    return (
      <div ref="lines" className="lines"
           style={{ left: left_offset + "em", height: store.lineHeight * store.lines.length, right: right }}
           onClick={this.onViewClick}
           onDoubleClick={this.onViewDoubleClick}>
        {lines}
        <EditorRenderIndentRanges ranges={store.indentRanges} />
        <EditorRenderCursorContainer cursors={store.cursors} />
      </div>
    );
  }
});

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * @constructor
 * @param {EditorStore} store  The editor store this minimap is to render
 * @param {Canvas}      canvas The canvas to which the minimap is to render
 */
var EditorMinimap = function (store, canvas) {
  this.store        = store;
  this.canvas       = canvas;

  var crect = canvas.getBoundingClientRect ();
  this.width        = crect.width;
  this.height       = crect.height;
  this.context      = canvas.getContext ("2d");
  this.buffer       = null;
  this.lineStart    = 0;
  this.lineEnd      = 0;
  this.sliderHeight = 0;
  this.sliderMaxTop = 0;
  this.sliderTop    = 0;

  this.SliderChanged = new EditorEvent ("EditorMinimap.SliderChanged");

  this.store.LinesChanged.bindTo (this, this.onLinesChanged);
  this.store.LineContentChanged.bindTo (this, this.onLineContentChanged);
  this.store.Scroll.bindTo (this, this.onScroll);
};

EditorMinimap.MIN_CHAR      = 32;
EditorMinimap.MAX_CHAR      = 126;
EditorMinimap.NUM_CHARS     = 1 + (EditorMinimap.MAX_CHAR - EditorMinimap.MIN_CHAR);
EditorMinimap.CHAR_WIDTH    = 2;
EditorMinimap.CHAR_HEIGHT   = 4;
EditorMinimap.CharacterData = [
  /*  32   */ 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, /*  33 ! */ 0x1e, 0x1f, 0x27, 0x29,  0x17, 0x18, 0x03, 0x03,
  /*  34 " */ 0x35, 0x35, 0x18, 0x18,  0x00, 0x00, 0x00, 0x00, /*  35 # */ 0x25, 0x34, 0x71, 0x81,  0x83, 0x6f, 0x06, 0x03,
  /*  36 $ */ 0x28, 0x43, 0x55, 0x3c,  0x33, 0x79, 0x0b, 0x18, /*  37 % */ 0x4c, 0x06, 0x65, 0x3c,  0x13, 0x8a, 0x00, 0x04,
  /*  38 & */ 0x3f, 0x22, 0x6c, 0x27,  0x5e, 0x93, 0x09, 0x0d, /*  39 ' */ 0x19, 0x1c, 0x0b, 0x0d,  0x00, 0x00, 0x00, 0x00,
  /*  40 ( */ 0x08, 0x35, 0x3d, 0x11,  0x32, 0x1b, 0x01, 0x28, /*  41 ) */ 0x32, 0x0b, 0x0a, 0x44,  0x14, 0x39, 0x28, 0x02,
  /*  42 * */ 0x2e, 0x35, 0x39, 0x41,  0x00, 0x00, 0x00, 0x00, /*  43 + */ 0x04, 0x05, 0x50, 0x58,  0x27, 0x2e, 0x00, 0x00,
  /*  44 , */ 0x00, 0x00, 0x00, 0x00,  0x14, 0x1c, 0x26, 0x0c, /*  45 - */ 0x00, 0x00, 0x0e, 0x0f,  0x15, 0x17, 0x00, 0x00,
  /*  46 . */ 0x00, 0x00, 0x00, 0x00,  0x16, 0x1b, 0x03, 0x04, /*  47 / */ 0x00, 0x3a, 0x11, 0x3e,  0x4d, 0x02, 0x25, 0x00,
  /*  48 0 */ 0x46, 0x46, 0x62, 0x68,  0x5b, 0x58, 0x08, 0x0a, /*  49 1 */ 0x35, 0x38, 0x07, 0x4d,  0x21, 0x66, 0x09, 0x0e,
  /*  50 2 */ 0x3e, 0x46, 0x02, 0x56,  0x64, 0x31, 0x0c, 0x0d, /*  51 3 */ 0x38, 0x46, 0x1c, 0x65,  0x2f, 0x63, 0x13, 0x05,
  /*  52 4 */ 0x0c, 0x56, 0x44, 0x54,  0x40, 0x79, 0x00, 0x06, /*  53 5 */ 0x54, 0x33, 0x4b, 0x47,  0x2d, 0x62, 0x14, 0x08,
  /*  54 6 */ 0x41, 0x35, 0x79, 0x48,  0x57, 0x5e, 0x08, 0x08, /*  55 7 */ 0x3f, 0x62, 0x01, 0x52,  0x38, 0x1e, 0x06, 0x00,
  /*  56 8 */ 0x44, 0x4a, 0x5d, 0x62,  0x60, 0x62, 0x06, 0x08, /*  57 9 */ 0x49, 0x48, 0x5d, 0x74,  0x27, 0x66, 0x10, 0x07,
  /*  58 : */ 0x00, 0x00, 0x1a, 0x25,  0x14, 0x1d, 0x03, 0x04, /*  59 ; */ 0x00, 0x00, 0x19, 0x25,  0x11, 0x1f, 0x23, 0x0e,
  /*  60 < */ 0x00, 0x01, 0x49, 0x4c,  0x2c, 0x4d, 0x00, 0x00, /*  61 = */ 0x00, 0x00, 0x45, 0x4d,  0x37, 0x3d, 0x00, 0x00,
  /*  62 > */ 0x01, 0x00, 0x44, 0x51,  0x46, 0x34, 0x00, 0x00, /*  63 ? */ 0x2e, 0x4d, 0x0a, 0x4e,  0x1e, 0x1e, 0x03, 0x03,
  /*  64 @ */ 0x2a, 0x3a, 0x64, 0x77,  0x61, 0x6f, 0x31, 0x31, /*  65 A */ 0x2c, 0x38, 0x4e, 0x4f,  0x6a, 0x71, 0x06, 0x06,
  /*  66 B */ 0x5b, 0x4a, 0x6c, 0x6e,  0x66, 0x6a, 0x0c, 0x04, /*  67 C */ 0x3d, 0x43, 0x5e, 0x00,  0x5e, 0x30, 0x03, 0x14,
  /*  68 D */ 0x5e, 0x44, 0x54, 0x5e,  0x6b, 0x66, 0x0c, 0x01, /*  69 E */ 0x57, 0x45, 0x6d, 0x41,  0x63, 0x2b, 0x0b, 0x0e,
  /*  70 F */ 0x52, 0x49, 0x69, 0x41,  0x55, 0x00, 0x06, 0x00, /*  71 G */ 0x41, 0x40, 0x5e, 0x33,  0x5f, 0x69, 0x04, 0x11,
  /*  72 H */ 0x3e, 0x3d, 0x76, 0x7f,  0x55, 0x54, 0x06, 0x06, /*  73 I */ 0x3f, 0x56, 0x1b, 0x3a,  0x35, 0x54, 0x0a, 0x0c,
  /*  74 J */ 0x1c, 0x56, 0x00, 0x54,  0x34, 0x58, 0x12, 0x03, /*  75 K */ 0x3e, 0x48, 0x88, 0x3f,  0x55, 0x62, 0x06, 0x06,
  /*  76 L */ 0x3e, 0x00, 0x55, 0x00,  0x62, 0x2f, 0x0a, 0x10, /*  77 M */ 0x60, 0x60, 0x7f, 0x8c,  0x4e, 0x50, 0x05, 0x05,
  /*  78 N */ 0x63, 0x3c, 0x73, 0x76,  0x51, 0x90, 0x05, 0x07, /*  79 O */ 0x45, 0x51, 0x53, 0x53,  0x5b, 0x62, 0x07, 0x0c,
  /*  80 P */ 0x55, 0x53, 0x67, 0x65,  0x54, 0x00, 0x06, 0x00, /*  81 Q */ 0x45, 0x51, 0x54, 0x54,  0x5c, 0x66, 0x07, 0x35,
  /*  82 R */ 0x5c, 0x48, 0x6d, 0x67,  0x54, 0x57, 0x06, 0x05, /*  83 S */ 0x3f, 0x3c, 0x4d, 0x42,  0x2e, 0x63, 0x0f, 0x09,
  /*  84 T */ 0x51, 0x6e, 0x16, 0x3f,  0x16, 0x3f, 0x01, 0x04, /*  85 U */ 0x3e, 0x3d, 0x55, 0x54,  0x5b, 0x62, 0x08, 0x0e,
  /*  86 V */ 0x3e, 0x3e, 0x4f, 0x4f,  0x3f, 0x50, 0x02, 0x05, /*  87 W */ 0x3a, 0x33, 0x73, 0x8a,  0x74, 0x74, 0x06, 0x06,
  /*  88 X */ 0x47, 0x3f, 0x35, 0x5b,  0x57, 0x55, 0x06, 0x06, /*  89 Y */ 0x40, 0x40, 0x39, 0x52,  0x15, 0x40, 0x02, 0x04,
  /*  90 Z */ 0x35, 0x75, 0x0a, 0x4e,  0x62, 0x36, 0x0b, 0x11, /*  91 [ */ 0x23, 0x39, 0x29, 0x24,  0x29, 0x24, 0x19, 0x30,
  /*  92 \ */ 0x3a, 0x00, 0x3a, 0x16,  0x01, 0x4e, 0x00, 0x25, /*  93 ] */ 0x18, 0x45, 0x00, 0x4c,  0x00, 0x4c, 0x18, 0x30,
  /*  94 ^ */ 0x30, 0x41, 0x1a, 0x1a,  0x00, 0x00, 0x00, 0x00, /*  95 _ */ 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x1f, 0x22,
  /*  96 ` */ 0x20, 0x16, 0x00, 0x00,  0x00, 0x00, 0x03, 0x00, /*  97 a */ 0x04, 0x04, 0x3a, 0x85,  0x5f, 0x77, 0x09, 0x0c,
  /*  98 b */ 0x42, 0x05, 0x6c, 0x66,  0x6a, 0x61, 0x07, 0x0e, /*  99 c */ 0x00, 0x08, 0x4b, 0x3d,  0x4e, 0x30, 0x02, 0x14,
  /* 100 d */ 0x03, 0x44, 0x58, 0x79,  0x58, 0x73, 0x08, 0x0d, /* 101 e */ 0x01, 0x06, 0x5e, 0x75,  0x60, 0x4e, 0x04, 0x15,
  /* 102 f */ 0x08, 0x58, 0x39, 0x5f,  0x18, 0x35, 0x02, 0x04, /* 103 g */ 0x03, 0x03, 0x58, 0x78,  0x58, 0x74, 0x2c, 0x50,
  /* 104 h */ 0x42, 0x04, 0x65, 0x63,  0x4c, 0x4d, 0x05, 0x05, /* 105 i */ 0x01, 0x22, 0x22, 0x4a,  0x20, 0x68, 0x0a, 0x0f,
  /* 106 j */ 0x00, 0x23, 0x1d, 0x52,  0x00, 0x4c, 0x2a, 0x36, /* 107 k */ 0x44, 0x00, 0x5b, 0x56,  0x55, 0x5b, 0x05, 0x06,
  /* 108 l */ 0x41, 0x22, 0x26, 0x27,  0x17, 0x4d, 0x00, 0x08, /* 109 m */ 0x04, 0x03, 0x6b, 0x99,  0x48, 0x88, 0x05, 0x09,
  /* 110 n */ 0x00, 0x04, 0x64, 0x64,  0x4c, 0x4d, 0x05, 0x05, /* 111 o */ 0x01, 0x05, 0x55, 0x64,  0x56, 0x61, 0x06, 0x0e,
  /* 112 p */ 0x00, 0x05, 0x6b, 0x66,  0x69, 0x62, 0x44, 0x0f, /* 113 q */ 0x02, 0x03, 0x55, 0x7d,  0x56, 0x75, 0x07, 0x4d,
  /* 114 r */ 0x00, 0x06, 0x4a, 0x57,  0x4a, 0x03, 0x05, 0x00, /* 115 s */ 0x00, 0x07, 0x55, 0x40,  0x26, 0x6f, 0x0c, 0x0a,
  /* 116 t */ 0x1b, 0x13, 0x4e, 0x4d,  0x20, 0x48, 0x00, 0x09, /* 117 u */ 0x00, 0x00, 0x4d, 0x4c,  0x54, 0x70, 0x05, 0x0d,
  /* 118 v */ 0x00, 0x00, 0x4e, 0x4e,  0x3a, 0x59, 0x01, 0x06, /* 119 w */ 0x00, 0x00, 0x4f, 0x5e,  0x6d, 0x7a, 0x05, 0x05,
  /* 120 x */ 0x00, 0x00, 0x4c, 0x5a,  0x45, 0x5d, 0x06, 0x06, /* 121 y */ 0x00, 0x00, 0x4f, 0x4f,  0x2e, 0x5f, 0x35, 0x25,
  /* 122 z */ 0x00, 0x00, 0x22, 0x78,  0x4c, 0x3e, 0x09, 0x0e, /* 123 { */ 0x00, 0x52, 0x25, 0x3b,  0x15, 0x44, 0x00, 0x48,
  /* 124 | */ 0x01, 0x3d, 0x01, 0x47,  0x01, 0x47, 0x01, 0x47, /* 125 } */ 0x28, 0x29, 0x02, 0x5d,  0x03, 0x55, 0x28, 0x20,
  /* 126 ~ */ 0x00, 0x00, 0x35, 0x3c,  0x04, 0x15, 0x00, 0x00
];

EditorMinimap.BrighterCharacterData = EditorMinimap.CharacterData.map (function (code) {
  return Math.min (255, Math.max (0, Math.round (code * 1.5)));
});

/**
 * Returns the index into the character data for the given character code.
 * @param {number} charCode The character to render
 */
EditorMinimap.getCharIndex = function (charCode) {
  return Math.max (0, Math.min (EditorMinimap.MAX_CHAR, charCode - EditorMinimap.MIN_CHAR));
};

/**
 * Returns the buffer the minimap renders to
 * @returns {ImageData} The rendering image buffer (or `null` if unable to create)
 */
EditorMinimap.prototype.getBuffer = function () {
  if (this.buffer === null) {
    if (this.width === 0 || this.height === 0) {
      return null;
    }

    this.canvas.width  = this.width;
    this.canvas.height = this.height;
    this.buffer        = this.context.createImageData (Math.ceil (this.width), Math.ceil (this.height));
  }

  return this.buffer;
};

/**
 * Clear the render buffer to the background color.
 *
 * The background color is looked up in the {@link EditorThemeColors} of the {@link EditorStore}.
 */
EditorMinimap.prototype.clearBuffer = function () {
  var buffer = this.getBuffer ();
  var color  = this.store.editorTheme.background;

  if (buffer) {
    var offset = 0;
    for (var i = 0; i < this.height; i++) {
      for (var j = 0; j < this.width; j++) {
        this.buffer.data[offset + 0] = color.r;
        this.buffer.data[offset + 1] = color.g;
        this.buffer.data[offset + 2] = color.b;
        this.buffer.data[offset + 3] = 0xff;
        offset += 4;
      }
    }
  }
};

/**
 * Update the layout information for the minimap elements.
 */
EditorMinimap.prototype.updateLayout = function () {
  const store       = this.store;
  const max_lines   = Math.floor (this.canvas.clientHeight / EditorMinimap.CHAR_HEIGHT);
  const line_height = store.lineHeight;
  const start_line  = store.getScrollTopLine ();
  const end_line    = store.getScrollBottomLine ();
  const line_count  = end_line - start_line + 1;

  this.width  = this.canvas.clientWidth;
  this.height = this.canvas.clientHeight;

  this.sliderHeight = Math.floor (line_count * EditorMinimap.CHAR_HEIGHT);
  this.sliderMaxTop = Math.max (0, store.lines.length * EditorMinimap.CHAR_HEIGHT - this.sliderHeight);
  this.sliderMaxTop = Math.min (this.height - this.sliderHeight, this.sliderMaxTop);
  this.SliderChanged.fire ();

  this.sliderRatio = this.sliderMaxTop / (line_height * store.lines.length - store.viewHeight);
  this.sliderTop   = store.scrollTop * this.sliderRatio;

  if (max_lines >= store.lines.length) {
    this.lineStart = 0;
    this.lineEnd   = store.lines.length - 1;
  } else {
    this.lineStart = Math.max (0, Math.floor (start_line - this.sliderTop / EditorMinimap.CHAR_HEIGHT));
    this.lineEnd   = Math.min (store.lines.length - 1, this.lineStart + max_lines - 1);
  }
};

/**
 * Renders a character into the minimap buffer.
 *
 * @param {number[]} charData The character data table
 * @param {ImageData} buffer The buffer to render to
 * @param {number} x The x-coordinate into the buffer
 * @param {number} y The y-coordinate into the buffer
 * @param {number} charCode The character code to render
 * @param {EditorColor} background The background color
 * @param {EditorColor} color The foreground color
 */
EditorMinimap.renderChar = function (charData, buffer, x, y, charCode, background, color) {
  const dest        = buffer.data;
  var   dest_offset = 4 * (y * buffer.width + x);
  const char_offset = EditorMinimap.getCharIndex (charCode) << 3;
  const remaining   = buffer.width - x;

  var br, bg, bb, cr, cg, cb;
  br = background.r;
  bg = background.g;
  bb = background.b;
  cr = color.r - br;
  cg = color.g - bg;
  cb = color.b - bb;

  if (remaining === 0) {
    return;
  } else if (remaining === 1) {
    var c = charData[char_offset + 0] / 255;
    dest[dest_offset + 0] = br + c * cr;
    dest[dest_offset + 1] = bg + c * cg;
    dest[dest_offset + 2] = bb + c * cb;
    dest[dest_offset + 3] = 0xff;
    dest_offset += 4 * buffer.width;

    c = charData[char_offset + 2] / 255;
    dest[dest_offset + 0] = br + c * cr;
    dest[dest_offset + 1] = bg + c * cg;
    dest[dest_offset + 2] = bb + c * cb;
    dest[dest_offset + 3] = 0xff;
    dest_offset += 4 * buffer.width;

    c = charData[char_offset + 4] / 255;
    dest[dest_offset + 0] = br + c * cr;
    dest[dest_offset + 1] = bg + c * cg;
    dest[dest_offset + 2] = bb + c * cb;
    dest[dest_offset + 3] = 0xff;
    dest_offset += 4 * buffer.width;

    c = charData[char_offset + 6] / 255;
    dest[dest_offset + 0] = br + c * cr;
    dest[dest_offset + 1] = bg + c * cg;
    dest[dest_offset + 2] = bb + c * cb;
    dest[dest_offset + 3] = 0xff;
  } else {
    var c = charData[char_offset + 0] / 255;
    dest[dest_offset + 0] = br + c * cr;
    dest[dest_offset + 1] = bg + c * cg;
    dest[dest_offset + 2] = bb + c * cb;
    dest[dest_offset + 3] = 0xff;

    c = charData[char_offset + 1] / 255;
    dest[dest_offset + 4] = br + c * cr;
    dest[dest_offset + 5] = bg + c * cg;
    dest[dest_offset + 6] = bb + c * cb;
    dest[dest_offset + 7] = 0xff;
    dest_offset += 4 * buffer.width;


    c = charData[char_offset + 2] / 255;
    dest[dest_offset + 0] = br + c * cr;
    dest[dest_offset + 1] = bg + c * cg;
    dest[dest_offset + 2] = bb + c * cb;
    dest[dest_offset + 3] = 0xff;

    c = charData[char_offset + 3] / 255;
    dest[dest_offset + 4] = br + c * cr;
    dest[dest_offset + 5] = bg + c * cg;
    dest[dest_offset + 6] = bb + c * cb;
    dest[dest_offset + 7] = 0xff;
    dest_offset += 4 * buffer.width;


    c = charData[char_offset + 4] / 255;
    dest[dest_offset + 0] = br + c * cr;
    dest[dest_offset + 1] = bg + c * cg;
    dest[dest_offset + 2] = bb + c * cb;
    dest[dest_offset + 3] = 0xff;

    c = charData[char_offset + 5] / 255;
    dest[dest_offset + 4] = br + c * cr;
    dest[dest_offset + 5] = bg + c * cg;
    dest[dest_offset + 6] = bb + c * cb;
    dest[dest_offset + 7] = 0xff;
    dest_offset += 4 * buffer.width;


    c = charData[char_offset + 6] / 255;
    dest[dest_offset + 0] = br + c * cr;
    dest[dest_offset + 1] = bg + c * cg;
    dest[dest_offset + 2] = bb + c * cb;
    dest[dest_offset + 3] = 0xff;

    c = charData[char_offset + 7] / 255;
    dest[dest_offset + 4] = br + c * cr;
    dest[dest_offset + 5] = bg + c * cg;
    dest[dest_offset + 6] = bb + c * cb;
    dest[dest_offset + 7] = 0xff;
    dest_offset += 4 * buffer.width;
  }
};

/**
 * Renders the minimap into the buffer and then copies the buffer to the canvas.
 *
 * If the buffer could not be created (@link EditorMinimap#getBuffer) then this function
 * performs no operations.
 */
EditorMinimap.prototype.render = function () {
  const store      = this.store;
  const theme      = store.editorTheme;
  const charData   = EditorMinimap.BrighterCharacterData;
  const buffer     = this.getBuffer ();
  const width      = this.width;

  if (!buffer) {
    return;
  }

  this.clearBuffer ();

  for (var y = 0, i = this.lineStart; i <= this.lineEnd; i++, y += 4) {
    var x = 0, line = store.lines[i];

    line.elements.forEach (function (element) {
      if (x < width && element.style !== null && element.style !== "whitespace") {
        const color = theme[element.style];
        for (var j = 0; j < element.text.length && x < width; j++, x += 2) {
          EditorMinimap.renderChar (charData, buffer, x, y, element.text.charCodeAt (j), theme.background, color);
        }
      } else {
        x += 2 * element.length;
      }
    });
  }

  this.context.putImageData (this.buffer, 0, 0);
};

/**
 * Callback for the {@link EditorStore#event:LinesChanged} event.
 *
 * This will update the layout information and then render the minimap.
 */
EditorMinimap.prototype.onLinesChanged = function () {
  this.updateLayout ();
  this.render ();
};

/**
 * Callback for the {@link EditorStore#event:LineContentChanged} event.
 *
 * If the line whose content has changed is within the range of the visible portion
 * of the minimap then the minimap is re-rendered.
 *
 * @param {EditorLine} line The line that was modified
 */
EditorMinimap.prototype.onLineContentChanged = function (line) {
  if (line.index >= this.lineStart && line.index <= this.lineEnd) {
    this.render ();
  }
};

/**
 * Callback for the {@link EditorStore#event:Scroll} event.
 *
 * Updates the layout information and then renders the minimap.
 */
EditorMinimap.prototype.onScroll = function () {
  this.updateLayout ();
  this.render ();
};

var EditorRenderMinimapSlider = React.createClass ({
  propTypes: {
    minimap: React.PropTypes.instanceOf (EditorMinimap).isRequired
  },

  getInitialState: function () {
    return { dragging: false, start: 0, startTop: 0 };
  },

  onSliderMouseDown: function (event) {
    if (event.button !== 0) {
      return;
    }

    this.setState ({ dragging: true, start: event.clientY, startTop: this.props.minimap.sliderTop }, function () {
      this.removeMouseMove = EditorTools.listen (document, "mousemove", this.onMouseMove);
      this.removeMouseUp   = EditorTools.listen (document, "mouseup", this.onMouseUp);
    }.bind (this));
  },

  onMouseMove: function (event) {
    const minimap = this.props.minimap;
    const delta   = event.clientY - this.state.start;
    const desired = Math.min (minimap.sliderMaxTop, Math.max (0, this.state.startTop + delta));

    if (minimap.sliderRatio > 0) {
      minimap.store.onScroll (Math.round (desired / minimap.sliderRatio), true);
    }
  },

  onMouseUp: function () {
    this.removeMouseMove ();
    this.removeMouseMove = null;

    this.removeMouseUp ();
    this.removeMouseUp = null;

    this.setState ({ dragging: false, start: 0, startTop: 0 });
    return false;
  },

  onSliderChanged: function () {
    this.forceUpdate ();
  },

  componentDidMount: function () {
    this.props.minimap.SliderChanged.bindTo (this, this.onSliderChanged);
  },

  componentWillUnmount: function () {
    this.props.minimap.SliderChanged.unbindFrom (this);
  },

  render: function () {
    const minimap = this.props.minimap;
    return (
      <div className={"slider" + (this.state.dragging ? " active" : "")}
           style={{ top: minimap.sliderTop, height: minimap.sliderHeight }}
           onMouseDown={this.onSliderMouseDown} />
    );
  }
});

var EditorRenderMinimap = React.createClass ({
  propTypes: {
    store: React.PropTypes.instanceOf (EditorStore).isRequired
  },

  onScroll: function (scrollTop) {
    const store = this.props.store;
    const limit = store.lineHeight * store.lines.length - store.viewHeight;
    this.refs.minimap.style.top = Math.max (0, Math.min (scrollTop, limit)) + "px";
  },

  /*
  onCanvasClick: function (event) {
    const minimap = this.minimap;
    const crect   = this.refs.minimap.getBoundingClientRect ();
    const offset  = event.clientY - crect.top;
    const desired = Math.min (minimap.sliderMaxTop, Math.max (0, offset - minimap.sliderHeight / 2));

    this.props.store.onScroll (Math.round (desired / minimap.sliderRatio));
  },
  */

  onCanvasClick: function (event) {
    const minimap = this.minimap;
    const crect   = this.refs.minimap.getBoundingClientRect ();
    const offset  = event.clientY - crect.top;
    const line    = Math.min (this.props.store.lines.length, minimap.lineStart + offset / EditorMinimap.CHAR_HEIGHT);

    this.props.store.scrollToLine (line, true);
  },

  refreshMinimap: function () {
    this.forceUpdate (function () {
      this.minimap.updateLayout ();
      this.minimap.render ();
    }.bind (this));
  },

  componentDidMount: function () {
    this.minimap = new EditorMinimap (this.props.store, this.refs.canvas);

    this.props.store.Scroll.bindTo (this, this.onScroll);
    this.props.store.LineHeightChanged.bindTo (this, this.refreshMinimap);
    this.props.store.editorTheme.Changed.bindTo (this, this.refreshMinimap);
  },

  componentWillUnmount: function () {
    this.props.store.Scroll.unbindFrom (this);
    this.props.store.LineHeightChanged.unbindFrom (this);
    this.props.store.editorTheme.Changed.unbindFrom (this);
  },

  render: function () {
    const store = this.props.store;
    const style = {
      top   : store.scrollTop,
      height: store.viewHeight
    };

    return (
      <div ref="minimap" className="minimap" style={style}>
        <canvas ref="canvas" onClick={this.onCanvasClick} />
        {this.minimap ? <EditorRenderMinimapSlider minimap={this.minimap} /> : null}
      </div>
    );
  }
});

/* --------------------------------------------------------------------------------------------------------------------------- */

var Editor = React.createClass ({
  propTypes: {
    store: React.PropTypes.instanceOf (EditorStore).isRequired
  },

  onScroll: function (scrollTop) {
    if (this.refs.container.scrollTop !== scrollTop) {
      this.refs.container.scrollTop = scrollTop;
    }
  },

  onContainerKeyDown: function (event) {
    if (this.props.store.keymap.onKeyDown (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  },

  onContainerKeyUp: function (event) {
    if (this.props.store.keymap.onKeyUp (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  },

  onContainerKeyPress: function (event) {
    if (this.props.store.keymap.onKeyPress (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  },

  onContainerFocus: function () {
    this.props.store.cursors.startBlink (true);
  },

  onContainerBlur: function () {
    this.props.store.cursors.stopBlink (false);
  },

  onContainerScroll: function () {
    this.props.store.onScroll (this.refs.container.scrollTop);
  },

  updateFromCharGuide: function () {
    const guide = this.refs.charGuide;
    const crect = guide.getBoundingClientRect ();
    this.props.store.setLineHeight (crect.height);
    this.props.store.setCharWidth (crect.width / 2);
  },

  updateFromViewHeight: function () {
    const container = this.refs.container;
    this.props.store.setViewHeight (container.clientHeight);
  },

  componentDidMount: function () {
    this.updateFromCharGuide ();
    this.updateFromViewHeight ();
    if (this.props.store.config.mountFocused) {
      window.setTimeout (function () {
        this.refs.container.focus ();
      }.bind (this));
    }

    this.props.store.Scroll.bindTo (this, this.onScroll);
  },

  componentWillUnmount: function () {
    this.props.store.Scroll.unbindFrom (this);
  },

  render: function () {
    const store = this.props.store;

    return (
      <div ref="container" className="editor" tabIndex={1}
           onKeyDown={this.onContainerKeyDown}
           onKeyUp={this.onContainerKeyUp}
           onFocus={this.onContainerFocus}
           onBlur={this.onContainerBlur}
           onScroll={this.onContainerScroll}>
        <div ref="charGuide" className="editor-char-guide">MM</div>
        <EditorRenderLineNumbers store={store} />
        <EditorRenderGutter store={store} />
        <EditorRenderLines store={store} />
        <EditorRenderMinimap store={store} />
      </div>
    );
  }
});
