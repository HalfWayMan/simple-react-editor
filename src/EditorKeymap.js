import { EditorPosition } from './EditorPosition.js';

/**
 * Represents a mapping from a key to a command.
 */
export class EditorKeyMapping {
  /**
   * Construct a new `EditorKeyMapping`.
   *
   * @constructor
   * @param {string}                 mode    The mode for this mapping (`null`, `up`, `down` or `press`)
   * @param {string|RegExp|function} key     The key to match (or a regular expression, or a function)
   * @param {boolean}                shift   Whether to mask for shift key up or down (`true`, `false` or `null`)
   * @param {boolean}                ctrl    Whether to mask for control key up or down (`true`, `false` or `null`)
   * @param {boolean}                alt     Whether to mask for alt key up or down (`true`, `false` or `null`)
   * @param {boolean}                meta    Whether to mask for meta key up or down (`true`, `false` or `null`)
   * @param {function}               command The function to invoke when the key is matched
   */
  constructor (mode, key, shift, ctrl, alt, meta, command) {
    /**
     * The mode for this mapping (`null`, `up`, `down` or `press`)
     * @type {string}
     */
    this.mode = mode;

    /**
     * The key to match (or a regular expression, or a function)
     * @type {string|RegExp|Function}
     */
    this.key = key;

    /**
     * Whether this mapping should constrain the shift key (pressed or not)
     * @type {boolean?}
     */
    this.shift = typeof shift === "undefined" ? null : shift;

    /**
     * Whether this mapping should constrain the control key (pressed or not)
     * @type {boolean?}
     */
    this.ctrl = typeof ctrl  === "undefined" ? null : ctrl;

    /**
     * Whether this mapping should constrain the alt key (pressed or not)
     * @type {boolean?}
     */
    this.alt = typeof alt   === "undefined" ? null : alt;

    /**
     * Whether this mapping should constrain the meta key (pressed or not)
     * @type {boolean?}
     */
    this.meta = typeof meta  === "undefined" ? null : meta;

    /**
     * The command to run if this mapping corresponds to an event
     * @type {Function}
     */
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

    /**
     * A function that matches a key event.
     *
     * Depending on the type of the `key` parameter, we set this property to a function that
     * will either:
     *
     * 1. Match the `key` property of an event object to the `key` parameter, if the `key`
     *    parameter is a `string`,
     *
     * 2. Test a regular expression in the `key` parameter against the `key` property of
     *    the event, or
     *
     * 3. If the `key` parameter is a function then it is assked to `keyMatcher`.
     *
     * @type {Function}
     */
    this.keyMatcher = null;
    if (typeof this.key === "string") {
      this.keyMatcher = (event) => {
        return event.key === this.key;
      };
    } else if (typeof this.key === "function") {
      this.keyMatcher = this.key;
    } else if (this.key instanceof RegExp) {
      this.keyMatcher = (event) => {
        return this.key.test (event.key);
      };
    } else {
      this.keyMatcher = (event) => {
        console.warn ("Fallback key matcher discarding event", event.key);
        return false;
      }
    }
  }

  /**
   * Test whether the given mode and event matches this keymapping.
   *
   * @param {string} mode  The key event mode (`up`, `down` or `press`)
   * @param {Event}  event The event object
   * @returns {boolean} Whether the given event matches this keymapping
   */
  matchesEvent (mode, event) {
    return (this.mode  === null || this.mode  === mode          ) &&
      (this.shift === null || this.shift === event.shiftKey) &&
      (this.ctrl  === null || this.ctrl  === event.ctrlKey ) &&
      (this.alt   === null || this.alt   === event.altKey  ) &&
      (this.meta  === null || this.meta  === event.metaKey ) &&
      this.keyMatcher (event);
  }
}


/**
 * Provides mechanism for processing key events.
 */
export class EditorKeymap {
  /**
   * Construct a new keymap
   * @param {EditorStore}  store  The store to which this keymap belongs
   * @param {KeymapConfig} config Configuration for the keymap
   */
  constructor (store, config) {
    /**
     * The store to which this keymap belongs
     * @type {EditorStore}
     */
    this.store = store;

    /**
     * The mappings that have been added to this keymap
     * @type {EditorKeyMapping[]}
     */
    this.mappings = [];

    /**
     * A correspondence from a key name to an array of corresponding mappings
     * @type {object}
     */
    this.mappingTable = {};

    if (config instanceof Array) {
      config.forEach ((mapping, index) => {
        this.mappings.push (mapping);

        if (typeof mapping.key === "string") {
          if (this.mappingTable.hasOwnProperty (mapping.key)) {
            this.mappingTable[mapping.key].push (mapping);
          } else {
            this.mappingTable[mapping.key];
          }
        }
      });
    }
  }

  /**
   * Process a key event.
   *
   * @param {string} mode The event mode (`up`, `down` or `press`)
   * @param {Event} event The event object
   */
  onKeyEvent (mode, event) {
    const store = this.store;

    var mappings = this.mappings;
    if (this.mappingTable.hasOwnProperty (event.key)) {
      mappings = this.mappingTable[event.key];
    }

    for (var i = 0; i < mappings.length; i++) {
      if (mappings[i].matchesEvent (mode, event)) {
        mappings[i].command (store, event);
        return true;
      }
    }

    return false;
  }

  /**
   * Process a key down event.
   *
   * @param {Event} event The key-down event
   */
  onKeyDown (event) {
    return this.onKeyEvent ("down", event);
  }

  /**
   * Process a key up event.
   *
   * @param {Event} event The key-up event
   */
  onKeyUp (event) {
    return this.onKeyEvent ("up", event);
  }

  /**
   * Process a key press event.
   *
   * @param {Event} event The key-press event
   */
  onKeyPress (event) {
    return this.onKeyEvent ("press", event);
  }

  /**
   * Default editor keymap.
   *
   * @type {EditorKeyMapping[]}
   */
  static DefaultKeymap = [
    new EditorKeyMapping ("down", "ArrowLeft", null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.moveLeft (1, event.shiftKey));
    }),

    new EditorKeyMapping ("down", "ArrowLeft", null, true, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.moveWordLeft (event.shiftKey));
    }),

    new EditorKeyMapping ("down", "ArrowRight", null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.moveRight (1, event.shiftKey));
    }),

    new EditorKeyMapping ("down", "ArrowRight", null, true, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.moveWordRight (event.shiftKey));
    }),

    new EditorKeyMapping ("down", "ArrowUp", null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.moveUp (1, event.shiftKey));
    }),

    new EditorKeyMapping ("down", "ArrowDown", null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.moveDown (1, event.shiftKey));
    }),

    new EditorKeyMapping ("down", "Home", null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.moveStart (true, event.shiftKey));
    }),

    new EditorKeyMapping ("down", "End", null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.moveEnd (event.shiftKey));
    }),

    new EditorKeyMapping ("down", "Home", false, true, false, false, (store, event) => {
      store.cursors.removeSecondary ();
      store.cursors.primary.setPosition (new EditorPosition (0, 0));
    }),

    new EditorKeyMapping ("down", "End", false, true, false, false, (store, event) => {
      const length = store.lines.get (store.lines.length - 1).length;
      store.cursors.removeSecondary ();
      store.cursors.primary.setPosition (new EditorPosition (store.lines.length - 1, length));
    }),

    /*
     * Cursor Duplication
     */

    new EditorKeyMapping ("down", "ArrowUp", true, true, false, false, (store, event) => {
      var cursor = store.cursors.lowest.clone ();
      cursor.moveUp (1, false);
    }),

    new EditorKeyMapping ("down", "ArrowDown", true, true, false, false, (store, event) => {
      var cursor = store.cursors.highest.clone ();
      cursor.moveDown (1, false);
    }),

    new EditorKeyMapping ("down", "Escape", false, false, false, false, (store, event) => {
      store.cursors.removeSecondary ();
      store.cursors.primary.removeSelection ();
    }),

    /*
     * Character Input
     */

    new EditorKeyMapping ("down", (event) => {
      if (event.key.length === 1) {
        return event.key.match (/(\w|\s|[-\|\[\]{}_=+;:'@#~,<.>\/\\?\!"£$%^&*()])/g);
      } else return false;
    }, null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.insertText (event.key));
    }),

    new EditorKeyMapping ("down", "Backspace", null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.deleteBackwards (1));
    }),

    new EditorKeyMapping ("down", "Delete", false, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.deleteForwards (1));
    }),

    new EditorKeyMapping ("down", "Enter", null, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.insertLine (true));
    }),

    new EditorKeyMapping ("down", "Tab", false, false, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.insertTab ());
    }),

    /*
     * Clipboard Interaction
     */

    new EditorKeyMapping ("down", "c", false, true, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.copySelected ());
    }),

    new EditorKeyMapping ("down", "x", false, true, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.copySelected (true));
    }),

    new EditorKeyMapping ("down", "v", false, true, false, false, (store, event) => {
      store.cursors.forEach (cursor => cursor.paste ());
    })
  ];
}

