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

var EditorLineMarker = function () {
};

var EditorLine = function (store, index, content) {
  this.id        = store.nextLineId ();
  this.store     = store;
  this.index     = index;
  this.content   = content;
  this.marker    = null;

  this.syntaxIn  = 0;     /* syntax state entering line */
  this.syntaxOut = 0;     /* syntax state exiting line */
  this.syntax    = store.config.syntax === null ? null : new EditorSyntaxEngine (store.config.syntax);
  this.render    = [];

  this.ContentChanged   = new EditorEvent ("EditorLine.ContentChanged");
  this.MarkerChanged    = new EditorEvent ("EditorLine.MarkerChanged");
  this.Clicked          = new EditorEvent ("EditorLine.Clicked");

  this.computeRender ();
};

EditorLine.prototype.setContent = function (content) {
  if (content !== this.content) {
    this.content = content;
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

EditorLine.prototype.computeRender = function () {
  var ESCAPED    = { '&': "&amp;", '<': "&lt;", '>': "&gt;" };
  var length     = this.content.length;
  var tab_size   = this.store.config.tabSize;
  var syntax     = this.syntax;
  var elements   = [];
  var current    = { style: null, start: 0, end: -1, chars: "" };
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
    current.end = last_index;
    elements.push (current);
    current = { style: null, start: last_index, end: -1, chars: "" };
  }

  function append_to_current (style, escaped, what) {
    var chars;

    if (typeof what === "number") {
      if (!escaped) {
        if (what === 0x3c) {
          chars = "&lt;";
        } else if (what === 0x3e) {
          chars = "&gt;";
        } else if (what === 0x26) {
          chars = "&amp;";
        } else {
          chars = String.fromCodePoint (what);
        }
      } else {
        chars = String.fromCodePoint (what);
      }
    } else if (typeof what === "string") {
      if (escaped) {
        chars = what;
      } else {
        chars = what.replace (/[&<>]/g, function (c) {
          return ESCAPED[c];
        });
      }
    } else {
      throw new Error ("Expected either number (codepoint) or string; found " + typeof what);
    }

    if (current.style === null) {
      current.style  = style;
      current.chars += chars;
    } else if (current.style !== style) {
      submit_current ();

      current.style = style;
      current.chars = chars;
    } else {
      current.chars += chars;
    }
  }

  var whitespaceRE = /\s/;

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

EditorCursor.prototype.insertLine = function () {
  if (this.selection) {
    /* replace selection */
  } else {
    if (this.position.column === 0) {
      /* Special case when at start of line: just insert empty line above */
      this.store.insertLine (this.position.line, new EditorLine (this.store, 0, ""));
      this.moveDown (1, false);
    } else if (this.position.column === this.getLine ().getLength ()) {
      /* Special case when at end of line: just insert empty line below */
      this.store.insertLine (this.position.line + 1, new EditorLine (this.store, 0, ""));
      this.moveDown (1, false);
    } else {
      const line   = this.getLine ();
      const latter = line.getTextFrom (this.position.column);
      line.deleteTextFrom (this.position.column);
      this.store.insertLine (this.position.line + 1, new EditorLine (this.store, 0, latter));
      this.setLocation ({ line: this.position.line + 1, column: 0 }, false);
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
        //this.moveUp (1, false);
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

/* Fire the 'LineChanged' with the two arguments (last line and new line) */
EditorCursor.prototype.onLineChanged = function (last_line, line) {
  this.LineChanged.fire (last_line, line);
};

/* Fire the 'ColumnChanged' with the two arguments (last column and new column) */
EditorCursor.prototype.onColumnChanged = function (last_column, column) {
  this.ColumnChanged.fire (last_column, column);
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
  // console.log (mode, event.key, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
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
     return true;
   }),
];

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorSyntaxEngine = function (config) {
  this.config = config || {};
  this.state  = 0;

  Object.keys (this.config).forEach (function (state_name) {
    if (this.config[state_name].import) {
      this.config[state_name] = Object.assign ({}, this.config[state_name]);
      var rules = this.config[state_name].rules = Object.assign ({}, this.config[state_name].rules);

      this.config[state_name].import.forEach (function (impdec) {
        if (!this.config.hasOwnProperty (impdec.state)) {
          throw new Error ("Unknown state '" + impdec.state + "' in import declaration");
        }

        if (!this.config[impdec.state].rules.hasOwnProperty (impdec.name)) {
          throw new Error ("Unknown rule '" + impdec.name + "' in state '" + impdec.state + "' in import declaration");
        }

        rules[impdec.name] = this.config[impdec.state].rules[impdec.name];
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

  for (var key in state.rules) {
    const rule = state.rules[key];
    const res  = rule.expr.exec (str);

    if (res) {
      /* If we have a 'goto' instruction, then set our new state */
      if (typeof rule.goto === "number") {
        this.state = rule.goto;
      }

      /* The style to apply is either the direct rule 'style' property or the 'style' property of our (possibly new) state */
      return { style: rule.style || this.config[this.state].style || state.style, length: res[0].length };
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
    rules: {
      line_comment_start: {
        expr:  /^\/\//,
        goto:  1
      },

      block_comment_start: {
        expr:  /^\/\*/,
        goto:  2
      },

      string_literal_start: {
        expr:  /^["]/,
        goto:  3
      },

      char_literal_start: {
        expr:  /^[']/,
        goto:  4
      },

      reserved_word: {
        expr:  /^(var|function|new|this|typeof|null|prototype|return|try|catch|if|else|for(all)?|continue|break|throw|while|do|instanceof)\b/,
        style: "reserved_word"
      },

      type_name: {
        expr:  /^[A-Z][a-zA-Z0-9_]*/,
        style: "type_name"
      },

      identifier: {
        expr:  /^[_a-z][a-zA-Z0-9_]*/,
        style: "identifier"
      },

      decimal: {
        expr:  /^[0-9]+(\.[0-9]*)?/,
        style: "number"
      },

      hexadecimal: {
        expr:  /^0[xX][0-9a-fA-F]+/,
        style: "number"
      },

      regexp: {
        expr:  /^\/.*\/[gimuy]*/,
        style: "regexp"
      }
    }
  },

  /* line comment */
  1: {
    style: "comment",
    $eol:  0
  },

  /* block comment */
  2: {
    style: "comment",
    rules: {
      block_comment_end: {
        expr:  /^\*\//,
        style: "comment",
        goto:  0
      }
    }
  },

  /* string literal */
  3: {
    style: "string_literal",
    rules: {
      string_literal_escape: {
        expr:  /^\\([\\'"bfnrtv0]|(?:[1-7][0-7]{0,2}|[0-7]{2,3})|(?:x[a-fA-F0-9]{2})|(?:u[a-fA-F0-9]{4}))/,
        style: "string_literal_escape"
      },

      string_literal_end: {
        expr: /^["]/,
        goto: 0
      }
    }
  },

  /* character literal */
  4: {
    style: "string_literal",
    rules: {
      char_literal_end: {
        expr: /^[']/,
        goto: 0
      }
    },

    import: [
      { state: 3, name: "string_literal_escape" },
    ]
  }
}

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

  this.config     = Object.assign ({}, EditorStore.defaultConfig, config);
  this.keymap     = new EditorKeymap (this, this.config.keymap);
  this.lines      = [];
  this.activeLine = 0;
  this.cursors    = new EditorCursorCollection (this);
  this.lineHeight = 0;
  this.charWidth  = 0;
  this.nextLineId = new EditorIdGenerator ();

  this.deserialize (initial);
};

EditorStore.defaultConfig = {
  lineNumbers:        true,
  minLineNumberChars: 2,
  gutter:             true,
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
    // console.debug ("Line height set to", height);
    this.lineHeight = height;
    this.onLineHeightChanged ();
  }
};

EditorStore.prototype.setCharWidth = function (width) {
  if (this.charWidth != width) {
    // console.debug ("Character width set to", width);
    this.charWidth = width;
    this.onCharWidthChanged ();
  }
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

EditorStore.prototype.onScroll = function (scrollTop) {
  this.Scroll.fire (scrollTop);
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
  }
};

EditorStore.prototype.onLinesChanged = function () {
  this.LinesChanged.fire ();
};

EditorStore.prototype.onLineHeightChanged = function () {
  this.LineHeightChanged.fire ();
};

EditorStore.prototype.onCharWidthChanged = function () {
  this.CharWidthChanged.fire ();
};

EditorStore.prototype.onLineContentChanged = function (line) {
  this.LineContentChanged.fire (line);
};

/* --------------------------------------------------------------------------------------------------------------------------- */
/* -- REACT COMPONENTS                                                                                                         */
/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorRenderLineNumbers = React.createClass ({
  propTypes: {
    store: React.PropTypes.instanceOf (EditorStore).isRequired
  },

  onScroll: function (scrollTop) {
    if (this.refs.hasOwnProperty ("lines")) {
      this.refs.lines.scrollTop = scrollTop;
    }
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
    this.props.store.Scroll.bindTo (this, this.onScroll);
    this.props.store.LinesChanged.bindTo (this, this.onLinesChanged);
  },

  componentWillUnmount: function () {
    this.props.store.Scroll.unbindFrom (this);
    this.props.store.LinesChanged.unbindFrom (this);
  },

  render: function () {
    if (this.props.store.config.lineNumbers) {
      const width = this.props.store.getLineNumberCharWidth ();
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

  onScroll: function (scrollTop) {
    if (this.refs.hasOwnProperty ("gutter")) {
      this.refs.gutter.scrollTop = scrollTop;
    }
  },

  onLinesChanged: function () {
    this.forceUpdate ();
  },

  componentDidMount: function () {
    this.props.store.Scroll.bindTo (this, this.onScroll);
    this.props.store.LinesChanged.bindTo (this, this.onLinesChanged);
  },

  componentWillUnmount: function () {
    this.props.store.Scroll.unbindFrom (this);
    this.props.store.LinesChanged.unbindFrom (this);
  },

  render: function () {
    if (this.props.store.config.gutter) {
      const width    = this.props.store.config.lineNumbers ? this.props.store.getLineNumberCharWidth () : 0;
      const elements = this.props.store.lines.map (function (line, index) {
        if (line.marker) {
          return <div key={index}><EditorRenderGutterMarker marker={line.marker} /></div>;
        } else {
          return null;
        }
      });

      return <div ref="gutter" className="gutter" style={{ left: width + "em" }}>{elements}</div>;
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
    const cursor = this.props.cursor;
    const client = cursor.store.indicesToClient (cursor.position);

    /* Make sure the initial visibility of a cursor corresponds to all others */
    client.visibility = cursor.store.cursors.blinkIndex ? "visible" : "hidden";
    return <div ref="cursor" className={EditorTools.joinClasses ("cursor", cursor.primary ? "" : "secondary")} style={client} />;
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
    const selections = this.props.cursors.map (function (cursor, index) {
      if (cursor.selection) {
        return <EditorRenderCursorSelection key={index} cursor={cursor} />;
      } else return null;
    });

    const cursors = this.props.cursors.map (function (cursor, index) {
      return <EditorRenderCursor key={index} cursor={cursor} />;
    });

    return (
      <div className="cursors">
        {selections}
        {cursors}
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

var EditorRenderLines = React.createClass ({
  propTypes: {
    store: React.PropTypes.instanceOf (EditorStore).isRequired
  },

  onScroll: function (event) {
    this.props.store.onScroll (this.refs.lines.scrollTop);
  },

  onClick: function (event) {
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

  componentDidMount: function () {
    this.props.store.CharWidthChanged.bindTo (this, this.onCharDimensionsChanged);
    this.props.store.LinesChanged.bindTo (this, this.onLinesChanged);
  },

  componentWillUnmount: function () {
    this.props.store.CharWidthChanged.unbindFrom (this);
    this.props.store.LinesChanged.unbindFrom (this);
  },

  render: function () {
    const left_offset = this.props.store.getLeftOffsetChars ();
    const lines       = this.props.store.lines.map (function (line, index) {
      return <EditorRenderLine key={line.id} line={line} />;
    });

    return (
      <div ref="lines" className="lines"
           style={{ left: left_offset + "em" }}
           onScroll={this.onScroll}
           onClick={this.onClick}>
        {lines}
        <EditorRenderCursorContainer cursors={this.props.store.cursors} />
      </div>
    );
  }
});

/* --------------------------------------------------------------------------------------------------------------------------- */

var Editor = React.createClass ({
  propTypes: {
    store: React.PropTypes.instanceOf (EditorStore).isRequired
  },

  onKeyDown: function (event) {
    if (this.props.store.keymap.onKeyDown (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  },

  onKeyUp: function (event) {
    if (this.props.store.keymap.onKeyUp (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  },

  onKeyPress: function (event) {
    if (this.props.store.keymap.onKeyPress (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  },

  onFocus: function () {
    this.props.store.cursors.startBlink (true);
  },

  onBlur: function () {
    this.props.store.cursors.stopBlink (false);
  },

  updateFromCharGuide: function () {
    const guide = this.refs.charGuide;
    this.props.store.setLineHeight (guide.clientHeight);
    this.props.store.setCharWidth (guide.getBoundingClientRect ().width / 2);
  },

  componentDidMount: function () {
    this.updateFromCharGuide ();
    if (this.props.store.config.mountFocused) {
      window.setTimeout (function () {
        this.refs.container.focus ();
      }.bind (this));
    }
  },

  render: function () {
    const store = this.props.store;

    return (
      <div ref="container" className="editor" tabIndex={1} onKeyDown={this.onKeyDown} onKeyUp={this.onKeyUp} onFocus={this.onFocus} onBlur={this.onBlur}>
        <div ref="charGuide" className="editor-char-guide">MM</div>
        <EditorRenderLineNumbers store={store} />
        <EditorRenderGutter store={store} />
        <EditorRenderLines store={store} />
      </div>
    );
  }
});
