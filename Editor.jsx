/**@jsx React.DOM*/

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorEvent = function (name) {
  this.name     = name || "<unknown event>";
  this.handlers = [];
};

EditorEvent.prototype.bind = function (cb) {
  this.bindTo (null, cb);
};

EditorEvent.prototype.bindTo = function (binding, cb) {
  if (typeof cb !== "function") {
    throw new TypeError ("Expected second argument to bindTo() to be a function");
  }

  this.handlers.push ({ callback: cb, binding: binding });
};

EditorEvent.prototype.unbind = function (cb) {
  this.handlers = this.handlers.filter (function (handler) {
    return handler.callback === cb;
  });
};

EditorEvent.prototype.unbindFrom = function (binding, cb) {
  this.handlers = this.handlers.filter (function (handler) {
    return !(handler.binding === binding && (typeof cb === "undefined" || handler.callback === cb));
  });
};

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

var EditorTools = {};

EditorTools.classSet = function (obj) {
  return Object.keys (obj).filter (function (key) {
    return obj[key];
  }).join (' ');
};

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

var EditorIdGenerator = function () {
  var next_id = 0, func = function () {
    return next_id++;
  };

  return func;
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorPosition = function (line, column) {
  this.line   = line;
  this.column = column;
};

EditorPosition.prototype.clone = function () {
  return new EditorPosition (this.line, this.column);
};

EditorPosition.prototype.toString = function () {
  return "(" + this.line + ":" + this.column + ")";
};

EditorPosition.prototype.equals = function (other) {
  return other.line === this.line && other.column === this.column;
};

EditorPosition.prototype.isBefore = function (other) {
  if (this.line < other.line) {
    return true;
  }

  if (this.line > other.line) {
    return false;
  }

  return this.column < other.column;
};

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

var EditorRange = function (start_line, start_col, end_line, end_col) {
  this.set (start_line, start_col, end_line, end_col);
};

EditorRange.prototype.toString = function () {
  return "[" + this.start_line + ":" + this.start_column + "," + this.end_line + ":" + this.end_column + "]";
};

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

EditorRange.fromPosition = function (position) {
  return new EditorRange (position.line, position.column, position.line, position.column);
};

EditorRange.prototype.getStartLocation = function () {
  return new EditorPosition (this.start_line, this.start_column);
};

EditorRange.prototype.getEndLocation = function () {
  return new EditorPosition (this.end_line, this.end_column);
};

EditorRange.prototype.setStartLocation = function (location) {
  this.start_line   = location.line;
  this.start_column = location.column;
};

EditorRange.prototype.setEndLocation = function (location) {
  this.end_line   = location.line;
  this.end_column = location.column;
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorColor = function (r, g, b) {
  this.r = r;
  this.g = g;
  this.b = b;
};

EditorColor.HEX3_RE = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
EditorColor.HEX6_RE = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
EditorColor.RGB_RE  = /^rgb\s*\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/;

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

EditorColor.fromRGB = function (str) {
  var result = EditorColor.RGB_RE.exec (str);
  if (result) {
    return new EditorColor (parseInt (result[1], 10), parseInt (result[2], 10), parseInt (result[3], 10));
  } else {
    throw new Error ("Invalid rgb color '" + str + "'");
  }
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorThemeColors = function () {
  this.background            = EditorColor.fromHex ("#000");
  this.whitespace            = EditorColor.fromHex ("#fff");
  this.plain                 = EditorColor.fromHex ("#fff");
  this.comment               = EditorColor.fromHex ("#fff");
  this.reserved_word         = EditorColor.fromHex ("#fff");
  this.identifier            = EditorColor.fromHex ("#fff");
  this.type_name             = EditorColor.fromHex ("#fff");
  this.string_literal        = EditorColor.fromHex ("#fff");
  this.string_literal_escape = EditorColor.fromHex ("#fff");
  this.number                = EditorColor.fromHex ("#fff");
  this.regexp                = EditorColor.fromHex ("#fff");

  this.Changed = new EditorEvent ("EditorThemeColors.Changed");
};

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

EditorThemeColors.prototype.onChanged = function () {
  this.Changed.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorLineMarker = function () {
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorLine = function (store, index, content) {
  this.id            = store.nextLineId ();
  this.store         = store;
  this.index         = index;
  this.content       = content;
  this.indent        = 0;
  this.marker        = null;

  this.syntaxIn      = 0;     /* syntax state entering line */
  this.syntaxOut     = 0;     /* syntax state exiting line */
  this.syntax        = store.config.syntax === null ? null : new EditorSyntaxEngine (store.config.syntax);

  this.render        = "";
  this.elements      = [];

  this.ContentChanged = new EditorEvent ("EditorLine.ContentChanged");
  this.MarkerChanged  = new EditorEvent ("EditorLine.MarkerChanged");
  this.Clicked        = new EditorEvent ("EditorLine.Clicked");

  this.updateIndent ();
  this.computeRender ();
};

EditorLine.prototype.setContent = function (content) {
  if (content !== this.content) {
    this.content = content;
    this.updateIndent ();
    this.computeRender ();
    this.onContentChanged ();
  }
};

EditorLine.prototype.getTextFrom = function (index) {
  return this.content.slice (index);
};

EditorLine.prototype.appendText = function (text) {
  this.setContent (this.content + text);
};

EditorLine.prototype.insertText = function (index, text) {
  if (index === this.content.length) {
    this.setContent (this.content + text);
  } else {
    this.setContent (this.content.slice (0, index) + text + this.content.slice (index));
  }
};

EditorLine.prototype.deleteText = function (index, count) {
  this.setContent (this.content.slice (0, index) + this.content.slice (index + count));
};

EditorLine.prototype.deleteTextFrom = function (index) {
  this.setContent (this.content.slice (0, index));
};

EditorLine.prototype.contains = function (what) {
  if (typeof what === "string") {
    return this.content.indexOf (what) !== -1;
  } else if (what instanceof RegExp) {
    return what.exec (this.content) !== null;
  }
};

EditorLine.prototype.containsInRange = function (what, start, end) {
  var in_range = this.content.substr (start, end - start);
  if (typeof what === "string") {
    return in_range.indexOf (what) !== -1;
  } else if (what instanceof RegExp) {
    return what.exec (in_range) !== null;
  }
};

EditorLine.prototype.getLength = function () {
  return this.content.length;
};

EditorLine.prototype.getPrevious = function () {
  return this.store.lines[this.index - 1] || null;
};

EditorLine.prototype.getNext = function () {
  return this.store.lines[this.index + 1] || null;
};

EditorLine.prototype.setMarker = function (marker) {
  this.marker = marker;
  this.onMarkerChanged ();
};

EditorLine.prototype.clearMarker = function () {
  if (this.marker !== null) {
    this.marker = null;
    this.onMarkerChanged ();
  }
};

EditorLine.prototype.setActive = function () {
  this.store.cursors.removeSecondary ();
  this.store.cursors.primary.setLine (this.index);
};

EditorLine.prototype.updateIndent = function () {
  var res = /^\s*/.exec (this.content);
  this.indent = res ? res[0].length : 0;
};

EditorLine.prototype.computeRender = function () {
  const ESCAPED    = { '&': "&amp;", '<': "&lt;", '>': "&gt;" };

  var length     = this.content.length;
  var tab_size   = this.store.config.tabSize;
  var syntax     = this.syntax;
  var elements   = [];
  var current    = { style: null, start: 0, end: -1, length: 0, original: "", chars: "" };
  var last_index = 0;

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
  }

  function submit_current () {
    current.end    = last_index;
    current.length = last_index - current.start;

    elements.push (current);
    current = { style: null, start: last_index, end: -1, length: 0, original: "", chars: "" };
  }

  function append_to_current (style, escaped, what) {
    var chars, original;

    if (typeof what === "number") {
      if (!escaped) {
        if (what === 0x3c) {
          chars    = "&lt;";
          original = "<";
        } else if (what === 0x3e) {
          chars    = "&gt;";
          original = ">";
        } else if (what === 0x26) {
          chars    = "&amp;";
          original = "&";
        } else {
          chars = original = String.fromCodePoint (what);
        }
      } else {
        chars = original = String.fromCodePoint (what);
      }
    } else if (typeof what === "string") {
      if (escaped) {
        chars = original = what;
      } else {
        original = what;
        chars    = what.replace (/[&<>]/g, function (c) {
          return ESCAPED[c];
        });
      }
    } else {
      throw new Error ("Expected either number (codepoint) or string; found " + typeof what);
    }

    if (current.style === null) {
      current.style     = style;
      current.chars    += chars;
      current.original += original;
    } else if (current.style !== style) {
      submit_current ();

      current.style    = style;
      current.chars    = chars;
      current.original = original;
    } else {
      current.chars    += chars;
      current.original += original;
    }
  }

  var whitespaceRE = /\s/;
  var in_indent    = true;

  while (last_index < length) {
    var char = this.content[last_index];
    var code = char.codePointAt (0);

    if (code === 0x09) { /* tab */
      for (var i = 0; i < tab_size; i++) {
        append_to_current ("whitespace", true, '&nbsp;');
      }

      last_index++;
    } else if (code === 0x20) { /* space */
      append_to_current ("whitespace", true, '&nbsp;');
      last_index++;
    } else if (whitespaceRE.test (char)) {
      append_to_current ("whitespace", true, '&nbsp;');
      last_index++;
    } else {
      var result = syntax ? syntax.match (this.content, last_index) : null;
      if (result) {
        /* We've matched a syntax rule and got back a descriptor with a style and match length */
        append_to_current (result.style, false, this.content.substring (last_index, last_index + result.length));
        last_index += result.length;
      } else {
        /* We've not matched anything, so get the default style of our current syntax state */
        append_to_current ((syntax ? syntax.getStateStyle () : null) || "plain", false, char);
        last_index++;
      }
    }
  }

  if (current.chars.length > 0) {
    submit_current ();
  }

  /* Pass the "end of line" into the syntax engine */
  if (syntax) {
    syntax.matchEOL ();
  }

  var builder = [];
  elements.forEach (function (element) {
    builder.push ("<span");

    if (element.style) {
      builder.push (" class=\"");
      builder.push (element.style);
      builder.push ("\"");
    }

    builder.push (">");
    builder.push (element.chars);
    builder.push ("</span>");
  });

  this.elements = elements;
  this.render   = builder.join ('');

  if (syntax) {
    this.syntaxOut = syntax.state;

    var next_line = this.getNext ();
    if (next_line && next_line.syntaxIn !== syntax.state) {
      next_line.computeRender ();
      next_line.onContentChanged ();
    }
  }
};

EditorLine.prototype.isEncapsulatorAt = function (column) {
  var char = this.content[column];
  return char === '[' || char === ']' || char === '(' || char === ')' || char === '{' || char === '}';
};

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

EditorLine.prototype.onContentChanged = function () {
  this.ContentChanged.fire ();
  this.store.onLineContentChanged (this);
};

EditorLine.prototype.onMarkerChanged = function () {
  this.MarkerChanged.fire ();
};

EditorLine.prototype.onClicked = function () {
  this.Clicked.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorSelection = function (start) {
  this.start  = start;
  this.region = EditorRange.fromPosition (start);
};

EditorSelection.prototype.adjustForCursor = function (location) {
  if (location.isBeforeOrEqual (this.start)) {
    this.region.set (location.line, location.column, this.start.line, this.start.column);
  } else {
    this.region.set (this.start.line, this.start.column, location.line, location.column);
  }
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorCursor = function (store, id, primary) {
  this.id        = id || null;
  this.primary   = primary || false;
  this.store     = store;
  this.position  = new EditorPosition (0, 0);
  this.selection = null;

  this.LineChanged      = new EditorEvent ("EditorCursor.LineChanged");
  this.ColumnChanged    = new EditorEvent ("EditorCursor.ColumnChanged");
  this.Changed          = new EditorEvent ("EditorCursor.Changed");
  this.SelectionChanged = new EditorEvent ("EditorCursor.SelectionChanged");
};

EditorCursor.prototype.clone = function () {
  var clone = new EditorCursor (this.store);
  clone.position = this.position.clone ();
  this.store.cursors.addCursor (clone);
  return clone;
};

EditorCursor.prototype.getLine = function () {
  return this.store.lines[this.position.line];
};

EditorCursor.prototype.setLine = function (line) {
  line = Math.min (this.store.getMaxLineNumber () - 1, Math.max (0, line));

  if (line !== this.position.line) {
    var last_line = this.position.line;
    this.position.line = line;
    this.onLineChanged (last_line, line);
    this.onChanged ();
  }
};

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

EditorCursor.prototype.getLocation = function () {
  return this.position.clone ();
};

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

EditorCursor.prototype.moveStart = function (extend_selection) {
  var prev_loc = this.getLocation ();
  this.setColumn (0);
  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};

EditorCursor.prototype.moveEnd = function (extend_selection) {
  var prev_loc = this.getLocation ();
  this.setColumn (this.getLine ().getLength ());
  if (extend_selection) {
    this.extendSelection (prev_loc);
  } else this.removeSelection ();
};

EditorCursor.prototype.insertText = function (text) {
  if (this.selection) {
    /* replace selection */
  } else {
    this.getLine ().insertText (this.position.column, text);
    this.moveRight (text.length, false);
  }
};

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

EditorCursor.prototype.insertLine = function () {
  if (this.selection) {
    /* replace selection */
  } else {
    var current_indent = this.getLine ().indent;
    var indent         = new Array (current_indent + 1).join (' ');

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

EditorCursor.prototype.extendSelection = function (prev_loc) {
  if (!this.selection) {
    this.selection = new EditorSelection (prev_loc);
  }

  this.selection.adjustForCursor (this.position);
  this.onSelectionChanged ();
};

EditorCursor.prototype.removeSelection = function () {
  if (this.selection) {
    this.selection = null;
    this.onChanged ();
  }
};

EditorCursor.prototype.isNextToEncapsulator = function () {
  return this.getLine ().isEncapsulatorAt (this.position.column) || this.getLine ().isEncapsulatorAt (this.position.column - 1);
};

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

/* Fire the 'LineChanged' with the two arguments (last line and new line) */
EditorCursor.prototype.onLineChanged = function (last_line, line) {
  this.LineChanged.fire (last_line, line);
  this.store.onCursorChanged (this);
};

/* Fire the 'ColumnChanged' with the two arguments (last column and new column) */
EditorCursor.prototype.onColumnChanged = function (last_column, column) {
  this.ColumnChanged.fire (last_column, column);
  this.store.onCursorChanged (this);
};

/* Fire the 'Changed' event (with no parameters) and then call 'onCursorChanged' in the EditorStore */
EditorCursor.prototype.onChanged = function () {
  this.Changed.fire ();
  this.store.onCursorChanged (this);
};

EditorCursor.prototype.onSelectionChanged = function () {
  this.SelectionChanged.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

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

EditorCursorCollection.prototype.sortSecondary = function () {
  this.secondary.sort (function (a, b) {
    return a.position.line - b.position.line;
  });
};

EditorCursorCollection.prototype.addCursor = function (cursor) {
  cursor.id = this.nextId ();
  this.secondary.push (cursor);
  this.sortSecondary ();
  this.lastAdded = this.secondary.length;
  this.onCursorAdded (cursor);
};

EditorCursorCollection.prototype.removeCursor = function (cursor) {
  cursor.id = null;
  this.removeCursorAt (this.secondary.indexOf (cursor));
};

EditorCursorCollection.prototype.removeCursorAt = function (index) {
  var cursor = this.secondary[index];
  if (this.lastAdded >= index + 1) {
    this.lastAdded--;
  }

  this.secondary.splice (index, 1);
  this.onCursorRemoved (cursor);
};

EditorCursorCollection.prototype.removeSecondary = function () {
  var old_secondary = this.secondary;
  this.secondary = [];

  for (var i = 0; i < old_secondary.length; i++) {
    this.onCursorRemoved (old_secondary[i]);
  }
};

EditorCursorCollection.prototype.getLastAddedIndex = function () {
  if (this.secondary.length === 0 || this.lastAdded === 0) {
    return 0;
  } else return this.lastAdded;
};

EditorCursorCollection.prototype.getAll = function () {
  var result = [];

  result[0] = this.primary;
  for (var i = 0; i < this.secondary.length; i++) {
    result[i + 1] = this.secondary[i];
  }

  return result;
};

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

EditorCursorCollection.prototype.forEach = function (action) {
  this.getAll ().forEach (action);
};

EditorCursorCollection.prototype.map = function (action) {
  return this.getAll ().map (action);
};

EditorCursorCollection.prototype.stopBlink = function (set_to) {
  window.clearInterval (this.blinker);
  this.blinker    = null;
  this.blinkIndex = set_to || false;
  this.onBlinker (this.blinkIndex);
};

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

EditorCursorCollection.prototype.onBlinker = function () {
  this.Blink.fire (this.blinkIndex);
};

EditorCursorCollection.prototype.onCursorAdded = function (cursor) {
  this.startBlink (true);
  this.CursorAdded.fire (cursor);
};

EditorCursorCollection.prototype.onCursorRemoved = function (cursor) {
  this.startBlink (true);
  this.CursorRemoved.fire (cursor);
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorKeymap = function (store, keymap) {
  this.store        = store;
  this.mappings     = [];
  this.mappingTable = {};

  this.deserialize (keymap);
};

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

EditorKeymap.Mapping.prototype.matchesEvent = function (mode, event) {
  return (this.mode  === null || this.mode  === mode          ) &&
         (this.shift === null || this.shift === event.shiftKey) &&
         (this.ctrl  === null || this.ctrl  === event.ctrlKey ) &&
         (this.alt   === null || this.alt   === event.altKey  ) &&
         (this.meta  === null || this.meta  === event.metaKey ) &&
         this.keyMatcher (event);
};

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

EditorKeymap.prototype.onKeyEvent = function (mode, event) {
  const store = this.store;

  if (this.mappingTable.hasOwnProperty (event.key)) {
    const mappings = this.mappingTable[event.key];
    for (var i = 0; i < mappings.length; i++) {
      if (mappings[i].matchesEvent (mode, event)) {
        if (mappings[i].command (store, event)) {
          return true;
        }
      }
    }
  }

  for (var i = 0; i < this.mappings.length; i++) {
    if (this.mappings[i].matchesEvent (mode, event)) {
      if (this.mappings[i].command (store, event)) {
        return true;
      }
    }
  }

  return false;
};

EditorKeymap.prototype.onKeyDown = function (event) {
  return this.onKeyEvent ("down", event);
};

EditorKeymap.prototype.onKeyUp = function (event) {
  return this.onKeyEvent ("up", event);
};

EditorKeymap.prototype.onKeyPress = function (event) {
  return this.onKeyEvent ("press", event);
};

EditorKeymap.defaultKeymap = [
  /*
   * Standard Cursor Direction
   */

  new EditorKeymap.Mapping ("down", "ArrowLeft", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveLeft (1, event.shiftKey);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "ArrowRight", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveRight (1, event.shiftKey);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "ArrowUp", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveUp (1, event.shiftKey);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "ArrowDown", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveDown (1, event.shiftKey);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "Home", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveStart (event.shiftKey);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "End", null, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveEnd (event.shiftKey);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "Home", false, true, false, false, function (store, event) {
    store.cursors.removeSecondary ();
    store.cursors.primary.setLocation ({ line: 0, column: 0 });
    return true;
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

    return true;
  }),

  /*
   * Cursor Duplication
   */

  new EditorKeymap.Mapping ("down", "ArrowUp", true, true, false, false, function (store, event) {
    var lowest = store.cursors.getCursorOnLowestLine ();
    var cursor = lowest.clone ();
    cursor.moveUp (1, false);
    return true;
  }),

  new EditorKeymap.Mapping ("down", "ArrowDown", true, true, false, false, function (store, event) {
    var highest = store.cursors.getCursorOnHighestLine ();
    var cursor  = highest.clone ();
    cursor.moveDown (1, false);
    return true;
  }),

  new EditorKeymap.Mapping ("down", "Escape", false, false, false, false, function (store, event) {
    store.cursors.removeSecondary ();
    store.cursors.primary.removeSelection ();
    return true;
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

     return true;
   }),

   new EditorKeymap.Mapping ("down", "Backspace", null, false, false, false, function (store, event) {
     store.cursors.forEach (function (cursor) {
       cursor.deleteBackwards (1);
     });

     return true;
   }),

   new EditorKeymap.Mapping ("down", "Delete", false, false, false, false, function (store, event) {
     store.cursors.forEach (function (cursor) {
       cursor.deleteForwards (1);
     });

     return true;
   }),

   new EditorKeymap.Mapping ("down", "Enter", null, false, false, false, function (store, event) {
     store.cursors.forEach (function (cursor) {
       cursor.insertLine ();
     });

     return true;
   }),

   new EditorKeymap.Mapping ("down", "Tab", false, false, false, false, function (store, event) {
     store.cursors.forEach (function (cursor) {
       cursor.insertTab ();
     });

     return true;
   }),
];

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorSyntaxEngine = function (config) {
  this.config = config || {};
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

EditorSyntaxEngine.prototype.getStateStyle = function () {
  return this.config[this.state].style;
};

EditorSyntaxEngine.prototype.match = function (content, index) {
  var str   = index ? content.substring (index) : content;
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

EditorSyntaxEngine.prototype.matchEOL = function () {
  var state = this.config[this.state];
  if (state.hasOwnProperty ("$eol")) {
    this.state = state["$eol"];
  }
};

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
        expr:  /^(var|function|new|this|typeof|true|false|null|prototype|return|try|catch|if|else|for(all)?|continue|break|throw|while|do|instanceof|const)\b/,
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

var EditorIndentRanges = function (store) {
  this.store  = store;
  this.ranges = [];

  this.Changed = new EditorEvent ("EditorIndentRanges.Changed");
  this.update ();
};

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

EditorIndentRanges.prototype.onChanged = function () {
  this.Changed.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorStore = function (config, initial) {
  this.Scroll             = new EditorEvent ("EditorStore.Scroll");
  this.CursorChanged      = new EditorEvent ("EditorStore.CursorChanged");
  this.CursorAdded        = new EditorEvent ("EditorStore.CursorAdded");
  this.CursorRemoved      = new EditorEvent ("EditorStore.CursorRemoved");
  this.LinesChanged       = new EditorEvent ("EditorStore.LinesChanged");
  this.LineHeightChanged  = new EditorEvent ("EditorStore.LineHeightChanged");
  this.CharWidthChanged   = new EditorEvent ("EditorStore.CharWidthChanged");
  this.LineContentChanged = new EditorEvent ("EditorStore.LineContentChanged");
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
  this.editorTheme  = new EditorThemeColors ();

  this.deserialize (initial);
};

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

EditorStore.prototype.getNextLineId = function () {
  return this.nextLineId++;
};

EditorStore.prototype.deserialize = function (obj) {
  if (typeof obj === "string") {
    this.lines = obj.split (/[\r\n]/).map (function (line, index) {
      return new EditorLine (this, index, line);
    }.bind (this));
  }

  /* Make sure we have at least one line */
  if (this.lines.length === 0) {
    this.lines.push (new EditorLine (this, 0, ""));
  }

  this.indentRanges.update ();
};

EditorStore.prototype.getText = function () {
  return this.lines.map (function (line) {
    return line.content;
  }).join ('\n');
};

EditorStore.prototype.setText = function (text) {
  /* Remove the secondary cursors and cancel any remaining selection */
  this.cursors.removeSecondary ();
  this.cursors.primary.removeSelection ();

  /* Move the primary cursor to 0 position */
  this.cursors.primary.setLocation ({ line: 0, column: 0 });

  /* Create the new lines */
  this.lines = obj.split (/[\r\n]/).map (function (line, index) {
    return new EditorLine (this, index, line);
  }.bind (this));

  /* Make sure we have at least one line */
  if (this.lines.length === 0) {
    this.lines.push (new EditorLine (this, 0, ""));
  }

  /* Notify the UI that the lines have changed */
  this.onLinesChanged ();
};

/* Renumerate the lines so their indices are correct */
EditorStore.prototype.renumerateLines = function () {
  this.lines.forEach (function (line, index) {
    line.index = index;
  });
};

EditorStore.prototype.insertLine = function (index, line) {
  this.lines.splice (index, 0, line);
  this.renumerateLines ();
  this.onLinesChanged ();
};

EditorStore.prototype.deleteLine = function (index) {
  this.lines.splice (index, 1);
  this.renumerateLines ();
  this.onLinesChanged ();
};

/* Test if the given line index is a valid index */
EditorStore.prototype.isValidLineIndex = function (index) {
  return index >= 0 && index < this.lines.length;
};

/* Get the maximum line number (i.e. total number of lines) */
EditorStore.prototype.getMaxLineNumber = function () {
  return this.lines.length;
};

/* Work out how many characters it would take to render the maximum line number, taking into account the minLineNumberChars
 * configuration. That is, given 1000 lines, we would return 4 (it'll take four characters maximum). Given 5 lines but a
 * minLineNumberChars configuration of two, we would return two (it'll only take one character, but the minimum is two).
 */
EditorStore.prototype.getLineNumberCharWidth = function () {
  return Math.max (this.config.minLineNumberChars, 1 + Math.floor (Math.log10 (this.getMaxLineNumber ())));
};

/* Work out the offset (in characters) from the left of the editor container to the actual editor content, taking into
 * account the line numbers and gutter. */
EditorStore.prototype.getLeftOffsetChars = function () {
  var with_gutter = this.config.gutter ? 1 : 0;
  if (this.config.lineNumbers) {
    return with_gutter + this.getLineNumberCharWidth ();
  } return with_gutter;
};

EditorStore.prototype.setLineHeight = function (height) {
  if (this.lineHeight !== height) {
    this.lineHeight = height;
    this.onLineHeightChanged ();
  }
};

EditorStore.prototype.setCharWidth = function (width) {
  if (this.charWidth != width) {
    this.charWidth = width;
    this.onCharWidthChanged ();
  }
};

EditorStore.prototype.setViewHeight = function (height) {
  this.viewHeight = height;
};

EditorStore.prototype.clientToIndices = function (left, top) {
  return {
    line:   Math.floor (top / this.lineHeight),
    column: Math.round (left / this.charWidth)
  };
};

EditorStore.prototype.indicesToClient = function (location) {
  var result = { left: 0, top: 0 };

  result.left = location.column * this.charWidth;
  result.top  = location.line * this.lineHeight;
  return result;
};

EditorStore.prototype.setCursorLocation = function (location) {
  this.cursors.removeSecondary ();
  this.cursors.primary.setLocation (location);
};

EditorStore.prototype.getScrollTopLine = function () {
  return Math.min (this.lines.length - 1, Math.max (0, Math.floor (this.scrollTop / this.lineHeight)));
};

EditorStore.prototype.getScrollBottomLine = function () {
  return this.getScrollTopLine () + Math.floor (this.viewHeight / this.lineHeight);
};

EditorStore.prototype.scrollToLine = function (line, center) {
  const offset = line * this.lineHeight;
  if (center) {
    this.onScroll (offset - this.viewHeight / 2);
  } else {
    this.onScroll (offset);
  }
};

EditorStore.prototype.onScroll = function (scrollTop) {
  this.scrollTop = Math.max (0, scrollTop);
  this.Scroll.fire (this.scrollTop);
};

EditorStore.prototype.onCursorChanged = function (cursor) {
  this.cursors.startBlink (true);
  this.CursorChanged.fire (cursor);

  if (cursor === this.cursors.primary) {
    if (this.activeLine !== cursor.position.line) {
      var prev = this.activeLine;
      this.activeLine = cursor.position.line;
      this.ActiveLineChanged.fire (prev, cursor.position.line);
    }

    if (cursor.position.line < this.getScrollTopLine ()) {
      this.onScroll (cursor.position.line * this.lineHeight);
    } else if (cursor.position.line >= this.getScrollBottomLine ()) {
      this.onScroll ((cursor.position.line + 1) * this.lineHeight - this.viewHeight);
    }
  }
};

EditorStore.prototype.onLinesChanged = function () {
  this.LinesChanged.fire ();
  this.indentRanges.update ();
};

EditorStore.prototype.onLineHeightChanged = function () {
  this.LineHeightChanged.fire ();
};

EditorStore.prototype.onCharWidthChanged = function () {
  this.CharWidthChanged.fire ();
};

EditorStore.prototype.onLineContentChanged = function (line) {
  this.LineContentChanged.fire (line);
  this.indentRanges.update ();
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
        top:   i * lineHeight,
        left:  left * charWidth,
        width: (right - left) * charWidth
      });
    }
  },

  onSelectionChanged: function () {
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
           style={{ top: line.index * lineHeight }}
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

  onViewClick: function (event) {
    var lines       = this.refs.lines;
    var client_rect = lines.getBoundingClientRect ();
    var top         = (event.clientY - client_rect.top) + lines.scrollTop;
    var left        = (event.clientX - client_rect.left) + lines.scrollLeft;
    var location    = this.props.store.clientToIndices (left, top);

    this.props.store.cursors.removeSecondary ();
    this.props.store.cursors.primary.removeSelection ();
    this.props.store.cursors.primary.setLocation (location, event.shiftKey);
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
           onClick={this.onViewClick}>
        {lines}
        <EditorRenderIndentRanges ranges={store.indentRanges} />
        <EditorRenderCursorContainer cursors={store.cursors} />
      </div>
    );
  }
});

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorMinimap = function (store, canvas) {
  this.store        = store;
  this.canvas       = canvas;
  this.width        = canvas.clientWidth;
  this.height       = canvas.clientHeight;
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

EditorMinimap.getCharIndex = function (charCode) {
  return Math.max (0, Math.min (EditorMinimap.MAX_CHAR, charCode - EditorMinimap.MIN_CHAR));
};

EditorMinimap.prototype.getBuffer = function () {
  if (this.buffer === null) {
    if (this.width === 0 || this.height === 0) {
      return null;
    }

    this.canvas.width  = this.width;
    this.canvas.height = this.height;
    this.buffer        = this.context.createImageData (this.width, this.height);
  }

  return this.buffer;
};

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

EditorMinimap.renderChar = function (charData, buffer, x, y, charCode, background, color) {
  const dest        = buffer.data;
  var   dest_offset = 4 * (y * buffer.width + x);
  const char_offset = EditorMinimap.getCharIndex (charCode) << 3;

  var br, bg, bb, cr, cg, cb;
  br = background.r;
  bg = background.g;
  bb = background.b;
  cr = color.r - br;
  cg = color.g - bg;
  cb = color.b - bb;

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
};

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
        for (var j = 0; j < element.original.length && x < width; j++, x += 2) {
          EditorMinimap.renderChar (charData, buffer, x, y, element.original.charCodeAt (j), theme.background, color);
        }
      } else {
        x += 2 * element.length;
      }
    });
  }

  this.context.putImageData (this.buffer, 0, 0);
};

EditorMinimap.prototype.onLinesChanged = function () {
  this.updateLayout ();
  this.render ();
};

EditorMinimap.prototype.onLineContentChanged = function (line) {
  if (line.index >= this.lineStart && line.index <= this.lineEnd) {
    this.render ();
  }
};

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
      minimap.store.onScroll (Math.round (desired / minimap.sliderRatio));
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
    this.props.store.setLineHeight (guide.clientHeight);
    this.props.store.setCharWidth (guide.getBoundingClientRect ().width / 2);
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
