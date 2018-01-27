import { EditorEvent } from './EditorEvent.js';
import { EditorClipboard } from './EditorClipboard.js';
import { EditorPosition } from './EditorPosition.js';
import { EditorRegion } from './EditorRegion.js';
import { EditorSelection } from './EditorSelection.js';
import { EditorLine } from './EditorLine.js';

export class EditorCursor {
  constructor (collection, id, is_primary) {
    /**
     * The ID of this cursor
     * @type {number?}
     */
    this.id = id || null;

    /**
     * Whether this is the primary cursor
     * @type {boolean}
     */
    this.primary = is_primary || false;

    /**
     * The {@link EditorCursorCollection} this cursor belongs to
     * @type {EditorCursorCollection}
     */
    this.collection = collection;

    /**
     * The position of the cursor
     * @type {EditorPosition}
     */
    this.position = new EditorPosition (0, 0);

    /**
     * The active selection for this cursor (or `null`)
     * @type {EditorSelection?}
     */
    this.selection = null;

    /**
     * The clipboard for this cursor
     * @type {EditorClipboard}
     */
    this.clipboard = new EditorClipboard (this.primary);

    /**
     * Event that is fired when the line position of the cursor has changed
     * @type {EditorEvent}
     * @param {number} prev_line The previous line number
     * @param {number} next_line The new line number
     */
    this.LineChanged = new EditorEvent ("EditorCursor.LineChanged");

    /**
     * Event that is fired when the column position of the cursor has changed
     * @type {EditorEvent}
     * @param {number} prev_col The previous column number
     * @param {number} next_col The new column number
     */
    this.ColumnChanged = new EditorEvent ("EditorCursor.ColumnChanged");

    /**
     * Event that is fired when the cursor's position has changed
     * @type {EditorEvent}
     * @param {EditorPosition} prev_pos The previous position of the cursor
     * @param {EditorPosition} next_pos The new position of the cursor
     */
    this.PositionChanged = new EditorEvent ("EditorCursor.PositionChanged");

    /**
     * Event that is fired when the cursor's selection has changed
     * @type {EditorEvent}
     */
    this.SelectionChanged = new EditorEvent ("EditorCursor.SelectionChanged");
  }

  /**
   * Create a new cursor at the same location as this one.
   *
   * This will create a new `EditorCursor` within the same {@link EditorCursorCollection}
   * and the same `position` property.
   *
   * The new cursor will automatically be added to the `EditorCursorCollection` that is
   * the container for this cursor.
   *
   * @returns {EditorCursor} A new cursor at the same location
   */
  clone () {
    var clone = new EditorCursor (this.collection);
    clone.position = this.position.clone ();
    this.collection.addCursor (clone);
    return clone;
  }

  /**
   * Returns the {@link EditorLine} on which this cursor resides.
   *
   * This is obtained by querying the {@link EditorLineCollection} from the {@link EditorStore}
   * to which the {@link EditorCursorCollection} this cursor belongs to.
   *
   * @returns {EditorLine} The line on which this cursor resides (or `null`)
   */
  get line () {
    return this.collection.store.lines.get (this.position.line);
  }

  /**
   * Set the line for this cursor.
   *
   * The line the cursor is moved to is clamped within the valid range of lines for the
   * {@link EditorLineCollection} assocated with the {@link EditorStore} to which our
   * {@link EditorCursorCollection} belongs. This makes sure that cursors are not moved
   * out of a valid range.
   *
   * If the cursor line is changed, then the {@link EditorCursor#LineChanged} event is
   * fired, after which the {@link EditorCursor#PositionChanged} event will be fired.
   *
   * @param {number} line The new line index for the cursor
   */
  setLine (line) {
    const lines = this.collection.store.lines;

    /* Make sure that the target line is in range of the collection */
    line = Math.min (lines.length - 1, Math.max (0, line));

    if (line !== this.position.line) {
      /* We've changed the line */
      var last_pos = this.position.clone ();
      this.position.line = line;
      this.onLineChanged (last_pos.line, line);
      this.onPositionChanged (last_pos, this.position.clone ());
    }
  }

  /**
   * Set the column for this cursor.
   *
   * The column of the cursor is clamped within the current line to ensure that the
   * cursor does not move outside a valid region.
   *
   * If the cursor column is changed, then the {@link EditorCursor#ColumnChanged} event
   * will be fired, after which the {@link EditorCursor#PositionChanged} event is
   * fired.
   *
   * @param {number} column The new column index for the cursor
   */
  setColumn (column) {
    const line = this.line;

    /* Make sure that the target column is in range of the current line */
    column = Math.min (line.length, Math.max (0, column));

    if (column !== this.position.column) {
      /* We have changed the column */
      var last_pos = this.position.clone ();
      this.position.column = column;
      this.onColumnChanged (last_pos.column, column);
      this.onPositionChanged (last_pos, this.position.clone ());
    }
  }

  /**
   * Set the location (both line and column) of the cursor.
   *
   * This will set the line and column of the cursor to the line and column given in the
   * argument {@link EditorPosition}. The new line and column of the cursor is clamped
   * to make sure that the cursor is not moved to an invalid location.
   *
   * If the cursor line is changed then the {@link EditorCursor#LineChanged} event is
   * fired.
   *
   * If the cursor column is changed then the {@link EditorCursor#ColumnChanged} event
   * is fired.
   *
   * If either the cursor line or column have changed then the {@link EditorCursor#PositionChanged}
   * event is fired.
   *
   * An option is given to extend the selection to include the new location.
   *
   * @param {EditorPosition} position           The new position of the cursor
   * @param {boolean}        [extend_selection] Whether to extend the selection (default: `false`)
   */
  setPosition (position, extend_selection) {
    const lines        = this.collection.store.lines;
    const prev_pos     = this.position.clone ();
    const line_index   = Math.min (lines.length - 1, Math.max (0, position.line));
    const line         = lines.get (line_index);
    const column_index = Math.min (line.length, Math.max (0, position.column));
    var   changed      = false;

    if (this.position.line !== line_index) {
      changed = true;
      this.position.line = line_index;
      this.onLineChanged (prev_pos.line, line_index);
    }

    if (this.position.column !== column_index) {
      changed = true;
      this.position.column = column_index;
      this.onColumnChanged (prev_pos.column, column_index);
    }

    if (changed) {
      this.onPositionChanged (prev_pos, this.position.clone ());
    }

    if (extend_selection) {
      this.extendSelection (prev_pos);
    } else this.removeSelection ();
  }

  moveUp (lines, extend_selection) {
    var prev_pos = this.position.clone ();
    this.setLine (this.position.line - lines);

    const line_length = this.line.length;
    if (this.position.column > line_length) {
      this.setColumn (line_length);
    }

    if (extend_selection) {
      this.extendSelection (prev_pos);
    } else this.removeSelection ();
  }

  moveDown (lines, extend_selection) {
    var prev_pos = this.position.clone ();
    this.setLine (this.position.line + lines);

    const line_length = this.line.length;
    if (this.position.column > line_length) {
      this.setColumn (line_length);
    }

    if (extend_selection) {
      this.extendSelection (prev_pos);
    } else this.removeSelection ();
  }

  moveLeft (columns, extend_selection) {
    if (!extend_selection && this.selection) {
      this.setPosition (this.selection.region.start);
      this.removeSelection ();
      return;
    }

    var prev_pos = this.position.clone ();

    if (this.position.column === 0 && this.position.line > 0) {
      const line = this.collection.store.lines.get (this.position.line - 1);
      this.setPosition ({ line: this.position.line - 1, column: line.length });
    } else {
      this.setColumn (this.position.column - columns);
    }

    if (extend_selection) {
      this.extendSelection (prev_pos);
    } else this.removeSelection ();
  }

  moveWordLeft (extend_selection) {
    if (!extend_selection && this.selection) {
      this.setPosition (this.selection.region.end);
      this.removeSelection ();
      return;
    }

    const prev_pos   = this.position.clone ();
    const word_start = this.line.findPreviousWordStart (this.position.column, true);

    if (word_start) {
      this.setPosition (word_start, extend_selection);
    }
  }

  moveRight (columns, extend_selection) {
    if (!extend_selection && this.selection) {
      this.setPosition (this.selection.region.end);
      this.removeSelection ();
      return;
    }

    var prev_pos = this.position.clone ();

    if (this.position.column === this.line.length && this.position.line < this.collection.store.lines.length) {
      this.setPosition ({ line: this.position.line + 1, column: 0 });
    } else {
      this.setColumn (this.position.column + columns);
    }

    if (extend_selection) {
      this.extendSelection (prev_pos);
    } else this.removeSelection ();
  }

  moveWordRight (extend_selection) {
    if (!extend_selection && this.selection) {
      this.setPosition (this.selection.region.end);
      this.removeSelection ();
      return;
    }

    const prev_pos = this.position.clone ();
    const word_end = this.line.findNextWordEnd (this.position.column, true);

    if (word_end) {
      this.setPosition (word_end, extend_selection);
    }
  }

  moveStart (respect_indent, extend_selection) {
    const prev_pos = this.position.clone ();

    if (respect_indent) {
      const current_indent = this.line.indent;
      if (this.position.column > current_indent) {
        this.setColumn (current_indent);
      } else {
        this.setColumn (0);
      }
    } else {
      this.setColumn (0);
    }

    if (extend_selection) {
      this.extendSelection (prev_pos);
    } else this.removeSelection ();
  }

  moveEnd (extend_selection) {
    const prev_pos = this.position.clone ();

    this.setColumn (this.line.length);
    if (extend_selection) {
      this.extendSelection (prev_pos);
    } else this.removeSelection ();
  }

  insertText (text) {
    if (this.selection) {
      /* replace selection */
      return null;
    } else {
      const line = this.line;

      line.insertText (this.position.column, text);
      this.moveRight (text.length, false);
      return line;
    }
  }

  insertTab () {
    const line   = this.line;
    const prev   = line.previous;
    const indent = prev ? prev.indent : 0;

    if (indent && this.position.column < indent && line.containsInRegion (/^\s*$/, 0, this.position.column)) {
      this.insertText (new Array (indent + 1).join (' '));
    } else {
      var tab_offset = this.position.column % this.collection.store.config.tabSize;
      this.insertText (new Array (1 + (this.collection.store.config.tabSize - tab_offset)).join (' '));
    }
  }

  insertLine (auto_indent) {
    if (this.selection) {
      /* replace selection */
    } else {
      var   result         = null;
      const current_indent = auto_indent ? this.line.indent : 0;
      const indent         = auto_indent ? new Array (current_indent + 1).join (' ') : "";

      if (this.position.column === 0) {
        /* Special case when at start of line: just insert empty line above */
        this.collection.store.lines.insertLine (this.position.line, result = new EditorLine (this.collection.store.lines, 0, indent));

        if (current_indent === 0) {
          this.moveDown (1, false);
        } else {
          this.setPosition ({ line: this.position.line + 1, column: current_indent }, false);
        }
      } else if (this.position.column === this.line.length) {
        /* Special case when at the end of a line: just insert an empty line below */
        this.collection.store.lines.insertLine (this.position.line + 1, result = new EditorLine (this.collection.store.lines, 0, indent));

        if (current_indent === 0) {
          this.moveDown (1, false);
        } else {
          this.setPosition ({ line: this.position.line + 1, column: current_indent }, false);
        }
      } else {
        const line   = this.line;
        const latter = line.getTextFrom (this.position.column);

        line.deleteTextFrom (this.position.column);
        this.collection.store.lines.insertLine (this.position.line + 1, result = new EditorLine (this.collection.store.lines, 0, indent + latter));
        this.setPosition ({ line: this.position.line + 1, column: current_indent }, false);
      }

      result.updateIndent ();
      result.computeRender ();
      return result;
    }
  }

  deleteBackwards (count) {
    if (this.selection) {
      this.deleteSelected ();
    } else {
      const line = this.line;

      if (this.position.column === 0) {
        const prev = line.previous;

        if (prev) {
          const prev_original_len = prev.length;

          prev.appendText (line.content);
          line.collection.deleteLine (line.index);
          this.setPosition ({ line: prev.index, column: prev_original_len }, false);
        }
      } else {
        line.deleteText (this.position.column - count, count);
        this.moveLeft (count, false);
      }
    }
  }

  deleteForwards (count) {
    if (this.selection) {
      this.deleteSelected ();
    } else {
      const line = this.line;

      if (this.position.column === line.length) {
        const next = line.next;

        if (next) {
          line.appendText (next.content);
          line.collection.deleteLine (line.index);
          this.setPosition ({ line: prev.index, column: prev_original_len }, false);
        }
      } else {
        line.deleteText (this.position.column, count);
      }
    }
  }

  extendSelection (prev_pos) {
    if (!this.selection) {
      this.selection = new EditorSelection (prev_pos);
    }

    this.selection.adjust (this.position);
    this.onSelectionChanged ();
  }

  selectLine (line) {
    if (!line) {
      line = this.line;
    }

    this.selection = EditorSelection.fromRegion (line.region);
    this.onSelectionChanged ();
    this.setPosition ({ line: line.index + 1, column: 0 });
  }

  selectWord () {
    const line       = this.line;
    const word_start = line.findPreviousWordStart (this.position.column, false);
    const word_end   = line.findNextWordEnd (this.position.column, false);

    if (word_start && word_end) {
      this.selection = EditorSelection.fromPositions (word_start, word_end);
      this.onSelectionChanged ();
      this.setColumn (word_end.column);
    }
  }

  removeSelection () {
    if (this.selection) {
      this.selection = null;
      this.onSelectionChanged ();
    }
  }

  deleteSelected () {
    if (this.selection) {
      const start = this.selection.region.start;
      this.collection.store.lines.removeRegion (this.selection.region);
      this.removeSelection ();
      this.setPosition (start);
    }
  }

  copySelected (cut) {
    if (this.selection) {
      const lines = this.collection.store.lines.acquireRegionContent (this.selection.region);
      this.clipboard.write (lines.join ("\n"));

      if (cut) {
        this.deleteSelected ();
      }
    } else {
      this.clipboard.write (this.line.content);
      if (cut) {
        this.collection.store.lines.deleteLine (this.position.line);
        this.setColumn (0);
      }
    }
  }

  paste () {
    const content = this.clipboard.read ();

    if (content) {
      if (content.indexOf ("\n") === -1) {
        this.insertText (content);
      } else {
        const lines    = content.split ('\n');
        var   inserted = [];

        for (var index = 0; index < lines.length; index++) {
          this.insertText (lines[index]);
          if (index < lines.length - 1) {
            this.insertLine (false);
          }
        }
      }
    }
  }

  isNextToEncapsulator () {
    return this.line.isEncapsulatorAt (this.position.column) || this.line.isEncapsulatorAt (this.position.column - 1);
  }

  getEncapsulatorOffset () {
    const line = this.line;

    if (line.isEncapsulatorAt (this.position.column)) {
      return 0;
    } else if (line.isEncapsulatorAt (this.position.column - 1)) {
      return -1;
    } else return null;
  }

  getMatchingEncapsulator () {
    const line = this.line;

    var encapsulator, encapsulator_column;
    if (line.isEncapsulatorAt (this.position.column)) {
      encapsulator_column = this.position.column;
      encapsulator = line.content[encapsulator_column];
    } else if (line.isEncapsulatorAt (this.position.column - 1)) {
      encapsulator_column = this.position.column - 1;
      encapsulator = line.content[encapsulator_column];
    } else return null;

    if (encapsulator === '{' || encapsulator === '(' || encapsulator === '[') {
      return line.getNextEncapsulator (encapsulator_column);
    } else if (encapsulator === '}' || encapsulator === ')' || encapsulator === ']') {
      return line.getPreviousEncapsulator (encapsulator_column);
    } else return null;
  }

  onLineChanged (last_line, next_line) {
    this.LineChanged.fire (last_line, next_line);
    this.collection.onCursorChanged (this);
  }

  onColumnChanged (last_col, next_col) {
    this.ColumnChanged.fire (last_col, next_col);
    this.collection.onCursorChanged (this);
  }

  onPositionChanged (last_pos, next_pos) {
    this.PositionChanged.fire (last_pos, next_pos);
    this.collection.onCursorChanged (this);
  }

  onSelectionChanged () {
    this.SelectionChanged.fire ();
  }
}
