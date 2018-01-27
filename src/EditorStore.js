import { EditorEvent } from './EditorEvent.js';
import { EditorCursorCollection } from './EditorCursorCollection.js';
import { EditorLineCollection } from './EditorLineCollection.js';
import { EditorViewMetrics } from './EditorViewMetrics.js';
import { EditorSyntaxEngine } from './EditorSyntax.js';
import { EditorKeymap } from './EditorKeymap.js';
import { EditorTheme } from './EditorTheme.js';

/**
 * The main storage and controller for an editor instance.
 */
export class EditorStore {
  /**
   * Construct a new `EditorStore`.
   *
   * @param {EditorConfig} [config] The configuration for the editor
   * @param {string|string[]} initial The initial contents of the editor
   */
  constructor (config, initial) {
    /**
     * The configuration for this editor
     * @type {EditorConfig}
     */
    this.config = Object.assign ({}, EditorStore.DefaultConfig, config);

    /**
     * The keymap for this editor
     * @type {EditorKeymap}
     */
    this.keymap = new EditorKeymap (this, this.config.keymap);

    /**
     * The syntax engine for this editor
     * @type {EditorSyntaxEngine}
     */
    this.syntax = this.config.syntax ? new EditorSyntaxEngine (this.config.syntax) : null;

    /**
     * The theme color extraction
     * @type {EditorTheme}
     */
    this.theme = new EditorTheme ();

    /**
     * The collection of lines for this store.
     * @type {EditorLineCollection}
     */
    this.lines = new EditorLineCollection (this);

    /**
     * The active line in this editor
     * @type {number}
     */
    this.activeLine = 0;

    /**
     * Event that is fired when the active line changes
     * @type {EditorEvent}
     * @param {number} prev_active The previous active line
     * @param {number} next_active The new active line
     */
    this.ActiveLineChanged = new EditorEvent ("EditorStore.ActiveLineChanged");

    /**
     * The collection of cursors for this store.
     * @type {EditorCursorCollection}
     */
    this.cursors = new EditorCursorCollection (this);

    /**
     * Information about the editor view
     * @type {EditorViewMetrics}
     */
    this.viewMetrics = new EditorViewMetrics (this);


    /* Bind a callback to the cursor collection that listens for when the primary cursor
     * has changed and makes sure that the view is scrolled sufficiently that the current
     * line position of the primary cursor does not escape the confines of the viewport.
     */
    this.cursors.CursorChanged.bindTo (this, (cursor) => {
      if (cursor === this.cursors.primary) {
        if (this.activeLine !== cursor.position.line) {
          const prev_active = this.activeLine;
          this.activeLine = cursor.position.line;
          this.onActiveLineChanged (prev_active, this.activeLine);
        }

        if (cursor.position.line <= this.viewMetrics.scrollTopLine) {
          this.viewMetrics.scrollTo (cursor.position.line * this.viewMetrics.lineHeight);
        } else if (cursor.position.line >= this.viewMetrics.scrollBottomLine) {
          this.viewMetrics.scrollTo ((cursor.position.line + 1) * this.viewMetrics.lineHeight - this.viewMetrics.viewHeight);
        }
      }
    });

    if (initial) {
      if (typeof initial === "string") {
        this.lines.setText (initial);
      } else if (initial instanceof Array) {
        this.lines.setLines (initial);
      }
    }
  }

  /**
   * Fire the {@link EditorStore#ActiveLineChanged} event.
   * @param {number} prev_active The previous active line
   * @param {number} next_active The new active line
   */
  onActiveLineChanged (prev_active, next_active) {
    this.ActiveLineChanged.fire (prev_active, next_active);
  }

  /**
   * Default configuration for an {@link EditorStore}.
   *
   * | Setting                        | Option Name          | Default Option                     |
   * |--------------------------------|----------------------|-----------------------------------:|
   * | Display Line Numbers           | `lineNumbers`        | yes                                |
   * | Minimum Line Number Characters | `minLineNumberChars` | 2                                  |
   * | Display Line Gutter            | `lineGutter`         | yes                                |
   * | Display Minimap                | `minimap`            | yes                                |
   * | Syntax Highlight Minimap       | `minimapColor`       | yes                                |
   * | Keymap Configuration           | `keymap`             | {@link EditorKeymap.DefaultKeymap} |
   * | Tab Size                       | `tabSize`            | 2                                  |
   * | Soft Tabs                      | `softTabs`           | yes                                |
   * | Syntax                         | `syntax`             | none                               |
   *
   * @type {EditorConfig}
   */
  static DefaultConfig = {
    lineNumbers:        true,
    minLineNumberChars: 2,
    lineGutter:         true,
    minimap:            true,
    minimapColor:       true,
    keymap:             EditorKeymap.DefaultKeymap,
    tabSize:            2,
    softTabs:           true,
    syntax:             null
  };
}

/**
 * The configuration for the editor, passed as the first argument to the {@link EditorStore} configuration.
 *
 * See {@link EditorStore.DefaultConfig} for the default configuration (or the defaults given below).
 *
 * @typedef {Object} EditorConfig
 * @property {boolean}            lineNumbers        Whether to enable line number display (defaults to `true`)
 * @property {number}             minLineNumberChars The minimum number of characters in the line number display (defaults to `2`)
 * @property {boolean}            lineGutter         Whether to display the line gutter (defaults to `true`)
 * @property {boolean}            minimap            Whether to display the minimap (defaults to `true`)
 * @property {boolean}            minimapColor       Whether to display syntax highlighting in the minimap (defaults to `true`)
 * @property {EditorKeymapConfig} keymap             The keymap configuration for the editor (defaults to {@link EditorKeymap.DefaultKeymap})
 * @property {number}             tabSize            The render size (in characters) of a tab character (defaults to `2`)
 * @property {boolean}            softTabs           Whether to use soft-tabs (replace tabs with spaces, defaults to `true`)
 * @property {SyntaxConfig}       syntax             The syntax highlighting configuration (defaults to `null`)
 */
