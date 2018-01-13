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
  var args = Array.prototype.slice.call (arguments, [0]);
  //console.debug ("firing event:", this.name);
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
    return false;
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

EditorRange.isEmpty = function (range) {
  return (range.start_line === range.end_line && range.start_column === range.end_column);
};

EditorRange.prototype.isEmpty = function () {
  return EditorRange.isEmpty (this);
};

EditorRange.fromPosition = function (position) {
  return new EditorRange (position.line, position.column, position.line, position.column);
};

EditorRange.containsPosition = function (range, position) {
  if (position.line < range.start_line || position.line > range.end_line) {
    return false;
  }

  if (position.line === range.start_line && position.column < range.start_column) {
    return false;
  }

  if (position.line === range.end_line && position.column > range.end_column) {
    return false;
  }

  return true;
}

EditorRange.prototype.containsPosition = function (position) {
  return EditorRange.containsPosition (position);
};

EditorRange.containsRange = function (range, other) {
  if (other.start_line < range.start_line || other.end_line < range.start_line) {
    return false;
  }

  if (other.start_line > range.end_line || other.end_line > range.end_line) {
    return false;
  }

  if (other.start_line === range.start_line && other.start_column < range.start_column) {
    return false;
  }

  if (other.end_line === range.end_line && other.end_column > range.end_column) {
    return false;
  }

  return true;
};

EditorRange.prototype.containsRange = function (other) {
  EditorRange.containsRange (this, other);
};

EditorRange.plusRange = function (a, b) {
  var start_line, start_col, end_line, end_col;

  if (b.start_line < a.start_line) {
    start_line = b.start_line;
    start_col = b.start_column;
  } else if (b.start_line === b.start_line) {
    start_line = b.start_line;
    start_col = Math.min (a.start_column, b.start_column);
  } else {
    start_line = a.start_line;
    start_col = a.start_column;
  }

  if (b.end_line > a.end_line) {
    end_line = b.end_line;
    end_col = b.end_column;
  } else if (b.end_line === a.end_line) {
    end_line = b.end_line;
    end_col = Math.max (b.end_column, a.end_column);
  } else {
    end_line = a.end_line;
    end_col = a.end_column;
  }

  return new EditorRange (start_line, start_col, end_line, end_col);
};

EditorRange.prototype.plusRange = function (other) {
  return EditorRange.plusRange (this, range);
};

EditorRange.intersectRanges = function (a, b) {
  var result_start_line = a.start_line;
  var result_start_col = a.start_column;
  var result_end_line = a.end_line;
  var result_end_col = a.end_column;
  var other_start_line = b.start_line;
  var other_start_col = b.start_column;
  var other_end_line = b.end_line;
  var other_end_col = b.end_column;

  if (result_start_line < other_start_line) {
    result_start_line = other_start_line;
    result_start_col = other_start_col;
  } else if (result_start_line === other_start_line) {
    result_start_column = Math.max (result_start_col, other_start_col);
  }

  if (result_end_line > other_end_line) {
    result_end_line = other_end_line;
    result_end_col = other_end_col;
  } else if (result_end_line === other_end_Line) {
    result_end_col = Math.min (result_end_col, other_end_col);
  }

  if (result_start_line > result_end_line) {
    return null;
  }

  if (result_start_line === result_end_line && result_start_col > result_end_col) {
    return null;
  }

  return new EditorRange (result_start_line, result_start_col, result_end_line, result_end_col);
};

EditorRange.prototype.intersectRange = function (other) {
  return EditorRange.intersectRanges (this, other);
};

EditorRange.equalsRange = function (a, b) {
  return !!a && !!b && a.start_line === b.start_line && a.start_column === b.start_column && a.end_line === b.end_line && a.end_column === b.end_column;
};

EditorRange.prototype.equalsRange = function (other) {
  return EditorRange.equalsRange (this, other);
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

EditorRange.prototype.collapseToStart = function () {
  return EditorRange.collapseToStart (this);
};

EditorRange.prototype.spansMultipleLines = function () {
  return this.end_line > this.start_line;
};

EditorRange.prototype.collapseToStart = function () {
  this.end_line   = this.start_line;
  this.end_column = this.end_column;
};

EditorRange.fromLocations = function (start, end) {
  return new EditorRange (start.line, start.column, end.line, end.column);
};

EditorRange.areIntersectingOrTouching = function (a, b) {
  if (a.end_line < b.start_line || (a.end_line === b.start_line && a.end_column < b.start_column)) {
    return false;
  }

  if (b.end_line < a.start_line || (b.end_line === a.start_line && b.end_column < a.start_column)) {
    return false;
  }

  return true;
};

EditorRange.compareRangesUsingStarts = function (a, b) {
  if (a.start_line === b.start_line) {
    if (a.start_column === b.start_column) {
      if (a.end_line === b.end_line) {
        return a.end_column - b.end_column;
      } else {
        return a.end_line - b.end_line;
      }
    } else {
      return a.start_column - b.start_column;
    }
  } else {
    return b.start_line - a.start_line;
  }
};

EditorRange.compareRangesUsingEnds = function (a, b) {
  if (a.end_line === b.end_line) {
    if (a.end_column === b.end_column) {
      if (a.start_line === b.start_line) {
        return a.start_column - b.start_column;
      } else {
        return a.start_line - b.start_line;
      }
    } else {
      return a.end_column - b.end_column;
    }
  } else {
    return a.end_line - b.end_line;
  }
}

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorLineMarker = function () {
};

var EditorLine = function (store, index, content) {
  this.store     = store;
  this.index     = index;
  this.content   = content;
  this.marker    = null;
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

EditorLine.prototype.getLength = function () {
  return this.content.length;
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
  var length     = this.content.length;
  var tab_size   = this.store.config.tabSize;
  var syntax     = this.store.syntax;
  var elements   = [];
  var current    = { type: null, start: 0, end: -1, chars: "" };
  var last_index = 0;

  function submit_current () {
    current.end = last_index;
    elements.push (current);
    current = { type: null, start: last_index, end: -1, chars: "" };
  }

  function append_to_current (type, what) {
    var chars;

    if (typeof what === "number") {
      chars = String.fromCodePoint (what);
    } else if (typeof what === "string") {
      chars = what;
    } else {
      throw new Error ("Expected either number (codepoint) or string; found " + typeof what);
    }

    if (current.type === null) {
      current.type = type;
      current.chars += chars;
    } else if (current.type !== type) {
      submit_current ();

      current.type  = type;
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
        append_to_current ("whitespace", ' ');
      }

      last_index++;
    } else if (code === 0x20) { /* space */
      append_to_current ("whitespace", ' ');
      last_index++;
    } else if (whitespaceRE.test (char)) {
      append_to_current ("whitespace", char);
      last_index++;
    } else {
      var rule = syntax ? syntax.match (this.content, last_index) : null;
      if (rule) {
        append_to_current (rule.type, this.content.substring (last_index, last_index + rule.length));
        last_index += rule.length;
      } else {
        append_to_current ("text", char);
        last_index++;
      }
    }
  }

  if (current.chars.length > 0) {
    submit_current ();
  }

  this.render = elements;
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
  this.getLine ().insertText (this.position.column, text);
  this.moveRight (text.length, false);
};

EditorCursor.prototype.deleteBackwards = function (count) {
  this.getLine ().deleteText (this.position.column - 1, 1);
  this.moveLeft (count, false);
};

EditorCursor.prototype.deleteForwards = function (count) {
  this.getLine ().deleteText (this.position.column, 1);
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
  this.primary   = new EditorCursor (store, 0, true);
  this.nextId    = 1;
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
  cursor.id = this.nextId++;
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
  } else return this.secondary[0];
};

EditorCursorCollection.prototype.getCursorOnHighestLine = function () {
  if (this.secondary.length === 0) {
    return this.primary;
  } else return this.secondary[this.secondary.length - 1];
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
  console.log (mode, event.key, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
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
      return event.key.match (/(\w|\s|[-\[\]{}_=+;:'@#~,<.>\/\\?\!"£$%^&*()])/g);
     } else return false;
   }, null, false, false, false, function (store, event) {
     store.cursors.forEach (function (cursor) {
       cursor.insertText (event.key);
     });

     return true;
   }),

   new EditorKeymap.Mapping ("down", "Backspace", false, false, false, false, function (store, event) {
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

   new EditorKeymap.Mapping ("down", "Enter", false, false, false, false, function (store, event) {
     store.cursors.forEach (function (cursor) {
       cursor.newLine ();
     });

     return true;
   }),

   new EditorKeymap.Mapping ("down", "Tab", false, false, false, false, function (store, event) {
     return true;
   }),
];

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorSyntax = function (config) {
  this.config = config || {};
};

EditorSyntax.prototype.match = function (content, index) {
  var match = index ? content.substring (index) : content;

  for (var key in this.config) {
    var res = this.config[key].exec (match);
    if (res) {
      return { type: key, length: res[0].length };
    }
  }

  return null;
};

EditorSyntax.JavaScript = {
  "comment":        /^(\/\/.*)|^(\/\*(\*(?!\/)|[^*])*\*\/)/,
  "string_literal": /^["'][^"'\\]*(\\.[^"'\\]*)*["']/,
  "reserved_word":  /^(var|function|new|this|typeof|null|prototype|return|try|catch|if|else|for(all)?|continue|break|throw|while|do)[^\w]/,
  "identifier":     /^[_a-z][a-zA-Z0-9_]*/,
  "type_name":      /^[A-Z][a-zA-Z0-9_]*/,
  "number":         /^(0[xX])?[0-9]+(\.[0-9]*)?/,
  "regexp":         /^\/.*\//,
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorStore = function (config, initial) {
  this.Scroll             = new EditorEvent ("EditorStore.Scroll");
  this.CursorChanged      = new EditorEvent ("EditorStore.CursorChanged");
  this.CursorAdded        = new EditorEvent ("EditorStore.CursorAdded");
  this.CursorRemoved      = new EditorEvent ("EditorStore.CursorRemoved");
  this.LineHeightChanged  = new EditorEvent ("EditorStore.LineHeightChanged");
  this.CharWidthChanged   = new EditorEvent ("EditorStore.CharWidthChanged");
  this.LineContentChanged = new EditorEvent ("EditorStore.LineContentChanged");
  this.ActiveLineChanged  = new EditorEvent ("EditorStore.ActiveLineChanged");

  this.config     = Object.assign ({}, EditorStore.defaultConfig, config);
  this.syntax     = new EditorSyntax (this.config.syntax);
  this.keymap     = new EditorKeymap (this, this.config.keymap);
  this.lines      = [];
  this.activeLine = 0;
  this.cursors    = new EditorCursorCollection (this);
  this.lineHeight = 0;
  this.charWidth  = 0;

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
  syntax:             EditorSyntax.JavaScript
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

/* Renumerate the lines so their indices are correct */
EditorStore.prototype.renumerateLines = function () {
  this.lines.forEach (function (line, index) {
    line.index = index;
  });
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
    console.debug ("Line height set to", height);
    this.lineHeight = height;
    this.onLineHeightChanged ();
  }
};

EditorStore.prototype.setCharWidth = function (width) {
  if (this.charWidth != width) {
    console.debug ("Character width set to", width);
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

  componentDidMount: function () {
    this.props.store.Scroll.bindTo (this, this.onScroll);
  },

  componentWillUnmount: function () {
    this.props.store.Scroll.unbindFrom (this);
  },

  render: function () {
    if (this.props.store.config.lineNumbers) {
      const width   = this.props.store.getLineNumberCharWidth ();
      const numbers = this.props.store.lines.map (function (line, index) {
        return <div key={index}>{1 + index}</div>;
      });

      return <div ref="lines" className="line-numbers" style={{ width: width + "em" }}>{numbers}</div>;
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
    if (this.props.marker) {
      return <span>M</span>;
    } else {
      return null;
    }
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

  componentDidMount: function () {
    this.props.store.Scroll.bindTo (this, this.onScroll);
  },

  componentWillUnmount: function () {
    this.props.store.Scroll.unbindFrom (this);
  },

  render: function () {
    if (this.props.store.config.gutter) {
      const width    = this.props.store.config.lineNumbers ? this.props.store.getLineNumberCharWidth () : 0;
      const elements = this.props.store.lines.map (function (line, index) {
        return <div key={index}><EditorRenderGutterMarker marker={line.marker} /></div>;
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
    console.log ("cursor", cursor.position);
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
      element.className = element.className.replace (/\scurrent-line/, '');
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

  renderElement: function (element, index) {
    return <span key={index} className={element.type}>{element.chars}</span>;
  },

  render: function () {
    const line      = this.props.line;
    const primary   = line.store.cursors.primary;
    const content   = line.render.map (this.renderElement);
    const classname = {
      "line":         true,
      "current-line": line.index === primary.line
    };

    return (
      <div ref="line" className={EditorTools.joinClasses (classname)}>
        {content}
      </div>
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

  componentDidMount: function () {
    this.props.store.CharWidthChanged.bindTo (this, this.onCharDimensionsChanged);
  },

  componentWillUnmount: function () {
    this.props.store.CharWidthChanged.unbindFrom (this);
  },

  render: function () {
    const left_offset = this.props.store.getLeftOffsetChars ();
    const lines       = this.props.store.lines.map (function (line, index) {
      return <EditorRenderLine key={index} line={line} />;
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
