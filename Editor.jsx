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
  console.debug ("firing event:", this.name);
  this.handlers.slice (0).forEach (function (handler) {
    try {
      handler.callback.apply (handler.binding, args);
    } catch (err) {
      console.error ("Error in event handler (" + this.name + "):", err);
    }
  });
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorTimer = function (name, callback, length, interval, hasZeroTick) {
  if (interval === null || typeof interval === "undefined") {
    if (length === null || typeof length === "undefined") {
      throw new Error ("Cannot create EditorTimer without either interval or length");
    }

    interval = length;
  }

  this.name     = name;
  this.callback = callback;
  this.length   = length;
  this.interval = interval;
  this.rounds   = 0;
  this.total    = (length === null || typeof length === "undefined") ? null : (length / interval);
  this.started  = null;
  this.ended    = null;
  this.handle   = null;
  this.state    = EditorTimer.State.STOPPED;
  this.zeroTick = hasZeroTick || false;

  this.Started  = new EditorEvent ("Timer[" + name + "].Started");
  this.Stopped  = new EditorEvent ("Timer[" + name + "].Stopped");
  this.Interval = new EditorEvent ("Timer[" + name + "].Interval");

  this.start ();
};

EditorTimer.State = {
  STOPPED: 0,
  RUNNING: 1
};

EditorTimer.prototype.duration = function () {
  if (this.state == EditorTimer.State.RUNNING) {
    var now = new Date ();
    return now.getTime () - this.started.getTime ();
  } else {
    return this.ended.getTime () - this.started.getTime ();
  }
};

EditorTimer.prototype.durationSeconds = function () {
  return Math.round (this.duration () / 1000);
};

EditorTimer.prototype.start = function () {
  if (this.state === EditorTimer.State.STOPPED) {
    console.debug ("Starting timer", this.name, "; interval:", this.interval, "ms, length:", this.length, "ms, total: ", this.total, "rounds");

    this.rounds  = 0;
    this.started = new Date ();
    this.ended   = null;

    this.state = EditorTimer.State.RUNNING;
    this.onStarted ();

    if (this.zeroTick) {
      /* We want to call the callback at round zero (not after interval, which would be round 1) */
      this.onTick ();
    } else {
      /* Otherwise call at round 1 */
      this.rounds = 1;
      this.handle = window.setTimeout (function () {
        this.onTick ();
      }.bind (this), this.interval);
    }
  } else {
    console.warn ("Attempting to start timer '" + this.name + "'; timer is already running");
  }
};

EditorTimer.prototype.stop = function () {
  console.debug ("Stopping timer", this.name);

  if (this.handle !== null) {
    window.clearTimeout (this.handle);
    this.handle = null;
  }

  if (this.state === EditorTimer.State.RUNNING) {
    this.state = EditorTimer.State.STOPPED;
    this.onStopped ();
  }
};

EditorTimer.prototype.onTick = function () {
  //console.debug ("Timer", this.time, "interval elapsed; round", this.rounds, "(elapsed:", this.duration ().toFixed (3), "ms)");
  this.Interval.fire (this);

  if (this.callback) {
    var result;
    try {
      result = this.callback (this);
    } catch (e) {
      console.error ("Exception in timer callback (" + this.name + "):", e);
    }

    this._handleCallbackResult (result);
  } else {
    this._handleCallbackResult (true);
  }
};

EditorTimer.prototype._handleCallbackResult = function (result) {
  if (result === false) {
    console.debug ("Timer", this.name, "stopped by callback return value");
    this.stop ();
  } else if (result instanceof Promise) {
    console.debug ("Response to callback in timer", this.name, "is a promise; awaiting result");
    result.then (function (res) {
      this._handleCallbackResult (res);
    }.bind (this));
  } else {
    this.rounds++;
    if ((this.total === null || this.rounds < this.total) && this.state === EditorTimer.State.RUNNING) {
      this.handle = window.setTimeout (function () {
        this.onTick ();
      }.bind (this), this.interval);
    }
  }
};

EditorTimer.prototype.onStarted = function () {
  this.Started.fire (this);
};

EditorTimer.prototype.onStopped = function () {
  this.Stopped.fire (this);
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

EditorTools.isNodeInRoot = function (node, root) {
  while (node) {
    if (node === root) {
      return true;
    }

    node = node.parentNode;
  }

  return false;
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
    }
  }
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorLineMarker = function () {
};

var EditorLine = function (store, index, content) {
  this.store   = store;
  this.index   = index;
  this.content = content;
  this.marker  = null;

  this.ContentChanged = new EditorEvent ("EditorLine.ContentChanged");
  this.MarkerChanged  = new EditorEvent ("EditorLine.MarkerChanged");
  this.Clicked        = new EditorEvent ("EditorLine.Clicked");
};

EditorLine.prototype.setContent = function (content) {
  if (content !== this.content) {
    this.content = content;
    this.onContentChanged ();
  }
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
  this.store.cursor.setLine (this.index);
};

EditorLine.prototype.onContentChanged = function () {
  this.ContentChanged.fire ();
};

EditorLine.prototype.onMarkerChanged = function () {
  this.MarkerChanged.fire ();
};

EditorLine.prototype.onClicked = function () {
  this.Clicked.fire ();
};

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorCursor = function (store) {
  this.store  = store;
  this.line   = 0;
  this.column = 0;

  this.LineChanged   = new EditorEvent ("EditorCursor.LineChanged");
  this.ColumnChanged = new EditorEvent ("EditorCursor.ColumnChanged");
  this.Changed       = new EditorEvent ("EditorCursor.Changed");
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

var EditorKeymap = function (store, keymap) {
  this.store          = store;
  this.keymap_lut     = {};
  this.key_matchers   = [];
  this.regex_matchers = [];

  this.deserialize (keymap);
};

EditorKeymap.prototype.deserialize = function (map) {
  if (map instanceof Array) {
    map.forEach (function (mapping, index) {
      if (typeof mapping === "object") {
        var obj = Object.assign ({ key: null, down: true, shift: false, ctrl: false, alt: false, command: null }, mapping);
        if (obj.key === "function") {
          this.key_matchers.push (obj);
        } else if (obj.key instanceof RegExp) {
          this.regex_matchers.push (obj);
        } else {
          if (this.keymap_lut.hasOwnProperty (obj.key)) {
            this.keymap_lut[obj.key].push (obj);
          } else {
            this.keymap_lut[obj.key] = [obj];
          }
        }
      } else {
        console.warn ("Expected object in keymap element at index", index);
      }
    }.bind (this));
  }
};

EditorKeymap.prototype.onKeyEvent = function (key, down, shift, ctrl, alt) {
  const store    = this.store;
  const mappings = this.keymap_lut[key];
  const event    = { key: key, down: down, shift: shift, ctrl: ctrl, alt: alt };

  if (mappings) {
    mappings.forEach (function (mapping) {
      if (mapping.down === down && mapping.shift === shift && mapping.ctrl === ctrl && mapping.alt === alt) {
        mapping.command (store, event);
      }
    });
  }

  this.regex_matchers.forEach (function (mapping) {
    if (mapping.key.test (key) && mapping.down === down && mapping.shift === shift && mapping.ctrl === ctrl && mapping.alt === alt) {
      mapping.command (store, event);
    }
  });

  this.key_matchers.forEach (function (mapping) {
    if (mapping.key (key) && mapping.down === down && mapping.shift === shift && mapping.ctrl === ctrl && mapping.alt === alt) {
      mapping.command (store, event);
    }
  });
};

EditorKeymap.prototype.onKeyDown = function (key, shift, ctrl, alt) {
  this.onKeyEvent (key, true, shift || false, ctrl || false, alt || false);
};

EditorKeymap.prototype.onKeyUp = function (key, shift, ctrl, alt) {
  this.onKeyEvent (key, false, shift || false, ctrl || false, alt || false);
};

EditorKeymap.defaultKeymap = [
  /* Standard direction keys */
  { key: "ArrowLeft",  command: function (store, event) { store.cursor.moveLeft (1, false);  } },
  { key: "ArrowRight", command: function (store, event) { store.cursor.moveRight (1, false); } },
  { key: "ArrowUp",    command: function (store, event) { store.cursor.moveUp (1, false);    } },
  { key: "ArrowDown",  command: function (store, event) { store.cursor.moveDown (1, false);  } },

  { key: "Home",       command: function (store, event) { store.cursor.setColumn (0); } },
  { key: "End",        command: function (store, event) { store.cursor.setColumn (store.cursor.getLine ().getLength ()); } },

  { ctrl: true, key: "Home", command: function (store, event) { store.cursor.setLocation ({ line: 0, column: 0 }); } },
  { ctrl: true, key: "End", command: function (store, event) {
    var line = store.lines.length - 1;
    if (store.lines.length > 0) {
      console.log (line, store.lines[line].getLength ());
      store.cursor.setLocation ({ line: line, column: store.lines[line].getLength () });
    } else {
      store.cursor.setLocation ({ line: 0, column: 0 });
    }
  } },
];

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorStore = function (config, initial) {
  this.Scroll            = new EditorEvent ("EditorStore.Scroll");
  this.CursorChanged     = new EditorEvent ("EditorStore.CursorChanged");
  this.LineHeightChanged = new EditorEvent ("EditorStore.LineHeightChanged");
  this.CharWidthChanged  = new EditorEvent ("EditorStore.CharWidthChanged");

  this.BlinkTimer = new EditorTimer ("EditorStore.BlinkTimer", null, null, 500);

  this.config     = Object.assign ({}, EditorStore.defaultConfig, config);
  this.keymap     = new EditorKeymap (this, this.config.keymap);
  this.lines      = [];
  this.cursor     = new EditorCursor (this);
  this.lineHeight = 0;
  this.charWidth  = 0;

  this.deserialize (initial);
};

EditorStore.defaultConfig = {
  lineNumbers:        true,
  minLineNumberChars: 2,
  gutter:             true,
  keymap:             EditorKeymap.defaultKeymap
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
  var result = { line: 0, column: 0 };
  result.line = Math.floor (top / this.lineHeight);
  result.column = Math.floor (left / this.charWidth);
  return result;
};

EditorStore.prototype.indicesToClient = function (location) {
  var result = { left: 0, top: 0 };

  result.left = location.column * this.charWidth;
  result.top  = location.line * this.lineHeight;
  return result;
};

EditorStore.prototype.onScroll = function (scrollTop) {
  this.Scroll.fire (scrollTop);
};

EditorStore.prototype.onCursorChanged = function (cursor) {
  this.CursorChanged.fire (cursor);
};

EditorStore.prototype.onLineHeightChanged = function () {
  this.LineHeightChanged.fire ();
};

EditorStore.prototype.onCharWidthChanged = function () {
  this.CharWidthChanged.fire ();
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

  onBlinkChanged: function (timer) {
    console.log (timer.round % 2 === 0);
  },

  componentDidMount: function () {
    this.props.cursor.Changed.bindTo (this, this.onCursorChanged);
    this.props.cursor.store.LineHeightChanged.bindTo (this, this.onDimensionsChanged);
    this.props.cursor.store.CharWidthChanged.bindTo (this, this.onDimensionsChanged);
    this.props.cursor.store.BlinkTimer.Interval.bindTo (this, this.onBlinkChanged);
  },

  componentWillUnmount: function () {
    this.props.cursor.Changed.unbindFrom (this);
    this.props.cursor.store.LineHeightChanged.unbindFrom (this);
    this.props.cursor.store.CharWidthChanged.unbindFrom (this);
    this.props.cursor.store.BlinkTimer.Interval.unbindFrom (this);
  },

  render: function () {
    const cursor = this.props.cursor;
    const client = cursor.store.indicesToClient (cursor);

    return <div className="cursor" style={client} />;
  }
});

/* --------------------------------------------------------------------------------------------------------------------------- */

var EditorRenderLine = React.createClass ({
  propTypes: {
    line: React.PropTypes.instanceOf (EditorLine).isRequired
  },

  render: function () {
    const line      = this.props.line;
    const cursor    = line.store.cursor;
    const classname = {
      "line":         true,
      "current-line": line.index === cursor.line
    };

    return <div className={EditorTools.joinClasses (classname)}>{line.content}</div>;
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
    this.props.store.cursor.setLocation (location);
  },

  onCursorChanged: function () {
    this.forceUpdate ();
  },

  componentDidMount: function () {
    this.props.store.CursorChanged.bindTo (this, this.onCursorChanged);
  },

  componentWillUnmount: function () {
    this.props.store.CursorChanged.unbindFrom (this);
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
        <EditorCursorRender cursor={this.props.store.cursor} />
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
    this.props.store.keymap.onKeyDown (event.key, event.shiftKey || false, event.ctrlKey || false, event.altKey || false);
  },

  onKeyUp: function (event) {
    this.props.store.keymap.onKeyUp (event.key, event.shiftKey || false, event.ctrlKey || false, event.altKey || false);
  },

  updateFromCharGuide: function () {
    const guide = this.refs.charGuide;
    this.props.store.setLineHeight (guide.clientHeight);
    this.props.store.setCharWidth (guide.getBoundingClientRect ().width / 2);
  },

  componentDidMount: function () {
    this.updateFromCharGuide ();
    this.refs.container.focus ();
  },

  render: function () {
    const store = this.props.store;

    return (
      <div ref="container" className="editor" tabIndex={1} onKeyDown={this.onKeyDown} onKeyUp={this.onKeyUp}>
        <div ref="charGuide" className="editor-char-guide">MM</div>
        <EditorRenderLineNumbers store={store} />
        <EditorRenderGutter store={store} />
        <EditorRenderLines store={store} />
      </div>
    );
  }
});
