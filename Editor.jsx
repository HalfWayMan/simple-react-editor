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

var EditorLineMarker = function () {
};

var EditorLine = function (store, index, content) {
  this.store     = store;
  this.index     = index;
  this.content   = content;
  this.marker    = null;
  this.selection = {};
  this.render    = [];

  if (index === 4) {
    this.selection[0] = { start: 4, end: 8 };
  } else if (index === 5) {
    this.selection[0] = { start: 2, end: 10 };
  }

  this.ContentChanged   = new EditorEvent ("EditorLine.ContentChanged");
  this.SelectionChanged = new EditorEvent ("EditorLine.SelectionChanged");
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

EditorLine.prototype.cancelSelection = function (cursor) {
  if (cursor.id in this.selection) {
    delete this.selection[cursor.id];
    this.onSelectionChanged ();
  }
};

EditorLine.prototype.updateSelection = function (cursor, selection) {
  this.selection[cursor.id] = selection;
  this.onSelectionChanged ();
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

EditorLine.prototype.onSelectionChanged = function () {
  this.SelectionChanged.fire ();
};

EditorLine.prototype.onMarkerChanged = function () {
  this.MarkerChanged.fire ();
};

EditorLine.prototype.onClicked = function () {
  this.Clicked.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorCursor = function (store, id, primary) {
  this.id        = id || null;
  this.primary   = primary || false;
  this.store     = store;
  this.line      = 0;
  this.column    = 0;
  this.selection = [];

  this.LineChanged   = new EditorEvent ("EditorCursor.LineChanged");
  this.ColumnChanged = new EditorEvent ("EditorCursor.ColumnChanged");
  this.Changed       = new EditorEvent ("EditorCursor.Changed");
};

EditorCursor.prototype.clone = function () {
  var clone = new EditorCursor (this.store);
  clone.line   = this.line;
  clone.column = this.column;
  this.store.cursors.addCursor (clone);
  return clone;
};

EditorCursor.prototype.getLine = function () {
  return this.store.lines[this.line];
};

EditorCursor.prototype.setLine = function (line) {
  line = Math.min (this.store.getMaxLineNumber () - 1, Math.max (0, line));

  if (line !== this.line) {
    var last_line = this.line;
    this.line     = line;
    this.onLineChanged (last_line, line);
    this.onChanged ();
  }
};

EditorCursor.prototype.setColumn = function (column) {
  var line = this.store.lines[this.line];

  column = Math.min (line.getLength (), Math.max (0, column));
  if (column !== this.column) {
    var last_column = this.column;
    this.column     = column;
    this.onColumnChanged (last_column, column);
    this.onChanged ();
  }
};

EditorCursor.prototype.setLocation = function (location) {
  var line_index   = Math.min (this.store.getMaxLineNumber () - 1, Math.max (0, location.line));
  var line         = this.store.lines[line_index];
  var column_index = Math.min (line.getLength (), Math.max (0, location.column));

  var changed = false;

  if (this.line != line_index) {
    var last_line = this.line;

    changed   = true;
    this.line = line_index;
    this.onLineChanged (last_line, line_index);
  }

  if (this.column != column_index) {
    var last_column = this.column;

    changed     = true;
    this.column = column_index;
    this.onColumnChanged (last_column, column_index);
  }

  if (changed) {
    this.onChanged ();
  }
};

EditorCursor.prototype.moveUp = function (lines, extend_selection) {
  this.setLine (this.line - lines);

  var length = this.getLine ().getLength ();
  if (this.column > length) {
    this.setColumn (length);
  }
};

EditorCursor.prototype.moveDown = function (lines, extend_selection) {
  this.setLine (this.line + lines);

  var length = this.getLine ().getLength ();
  if (this.column > length) {
    this.setColumn (length);
  }
};

EditorCursor.prototype.moveLeft = function (columns, extend_selection) {
  if (this.column === 0 && this.line > 0) {
    var line = this.store.lines[this.line - 1];
    this.setLocation ({ line: this.line - 1, column: line.getLength () });
  } else {
    this.setColumn (this.column - columns);
  }
};

EditorCursor.prototype.moveRight = function (columns, extend_selection) {
  if (this.column === this.getLine ().getLength () && this.line < this.store.lines.length) {
    this.setLocation ({ line: this.line + 1, column: 0 });
  } else {
    this.setColumn (this.column + columns);
  }
};

EditorCursor.prototype.insertText = function (text) {
  this.getLine ().insertText (this.column, text);
  this.moveRight (text.length, false);
};

EditorCursor.prototype.deleteBackwards = function (count) {
  this.getLine ().deleteText (this.column - 1, 1);
  this.moveLeft (count, false);
};

EditorCursor.prototype.deleteForwards = function (count) {
  this.getLine ().deleteText (this.column, 1);
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

EditorCursorCollection.prototype.addCursor = function (cursor) {
  cursor.id = this.nextId++;
  this.secondary.push (cursor);
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
  console.log (mode, event.key, event.shift, event.ctrl, event.alt, event.meta);
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

  new EditorKeymap.Mapping ("down", "ArrowLeft", false, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveLeft (1, false);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "ArrowRight", false, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveRight (1, false);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "ArrowUp", false, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveUp (1, false);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "ArrowDown", false, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.moveDown (1, false);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "Home", false, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.setColumn (0);
    });

    return true;
  }),

  new EditorKeymap.Mapping ("down", "End", false, false, false, false, function (store, event) {
    store.cursors.forEach (function (cursor) {
      cursor.setColumn (cursor.getLine ().getLength ());
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
    if (this.activeLine !== cursor.line) {
      var prev = this.activeLine;
      this.activeLine = cursor.line;
      this.ActiveLineChanged.fire (prev, cursor.line);
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

var EditorCursorRender = React.createClass ({
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
    const client = cursor.store.indicesToClient (cursor);

    /* Make sure the initial visibility of a cursor corresponds to all others */
    client.visibility = cursor.store.cursors.blinkIndex ? "visible" : "hidden";
    return <div ref="cursor" className={EditorTools.joinClasses ("cursor", cursor.primary ? "" : "secondary")} style={client} />;
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
    const cursors = this.props.cursors.map (function (cursor, index) {
      return <EditorCursorRender key={index} cursor={cursor} />;
    });

    return <div className="cursors">{cursors}</div>;
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

  onSelectionChanged: function () {
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
    this.props.line.SelectionChanged.bindTo (this, this.onSelectionChanged);
    this.props.line.store.ActiveLineChanged.bindTo (this, this.onActiveLineChanged);
  },

  componentWillUnmount: function () {
    this.props.line.ContentChanged.unbindFrom (this);
    this.props.line.SelectionChanged.unbindFrom (this);
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

    const charWidth  = line.store.charWidth;
    const selections = Object.keys (line.selection).map (function (cursor_id) {
      const selection = line.selection[cursor_id];
      return <div key={cursor_id} className="selection" style={{ left: selection.start * charWidth, width: (selection.end - selection.start) * charWidth }}></div>;
    });

    return (
      <div ref="line" className={EditorTools.joinClasses (classname)}>
        {selections}
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
    this.props.store.cursors.primary.setLocation (location);
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
