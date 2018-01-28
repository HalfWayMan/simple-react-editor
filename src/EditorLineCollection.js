import { EditorEvent } from './EditorEvent.js';
import { EditorStore } from './EditorStore.js';
import { EditorLine } from './EditorLine.js';
import { EditorIndentRegions } from './EditorIndentRegions.js';
import { EditorIdGenerator } from './EditorTools.js';
import { EditorRegion } from './EditorRegion.js';

/**
 * A collection of {@link EditorLine} that make up a document.
 *
 */
export class EditorLineCollection {
  /**
   * Construct a new instance of an `EditorLineCollection`.
   *
   * @param {EditorStore} store The store to which we are attached
   */
  constructor (store) {
    /**
     * The store to which this collection belongs
     * @type {EditorStore}
     */
    this.store = store;

    /**
     * The lines that we have attached to this store
     * @type {EditorLine[]}
     */
    this.lines = [];

    /**
     * The indentation regions
     * @type {EditorIndentRegions}
     */
    this.indentRegions = new EditorIndentRegions (this);

    /**
     * ID generator for line IDs.
     * @type {EditorIdGenerator}
     */
    this.nextId = new EditorIdGenerator ();

    /**
     * The lines in the collection have changed
     * @type {EditorEvent}
     */
    this.LinesChanged = new EditorEvent ("EditorLineCollection.LinesChanged");

    /**
     * The content of a line has changed
     * @type {EditorEvent}
     * @param {EditorLine} line The line that has changed
     */
    this.LineContentChanged = new EditorEvent ("EditorLineCollection.LineContentChanged");

    /* Make sure that we have at least one line in the editor */
    this.lines.push (new EditorLine (this, 0, ""));
  }

  /**
   * Get the next line ID from the ID generator.
   * @returns {number} The next line ID
   */
  nextLineId () {
    return this.nextId ();
  }

  /**
   * Get the line at the given index (or `null`)
   * @param {number} index The line index
   * @returns {EditorLine} The line at the given index (or `null`)
   */
  get (index) {
    return this.lines[index] || null;
  }

  /**
   * Get the number of lines in this collection
   * @type {number} The number of lines in the collection
   */
  get length () {
    return this.lines.length;
  }

  /**
   * Map a function over each line and return the results.
   *
   * @param {Function} action The action to map over each line
   * @returns {*[]} The collected results of calling the action on each line
   */
  map (action) {
    return this.lines.map (action);
  }

  /**
   * Run function over each line and return the results.
   *
   * @param {Function} action The action to run for each line
   */
  forEach (action) {
    return this.lines.forEach (action);
  }

  /**
   * Filter the lines in the collection.
   *
   * @param {Function} action Function to filter the lines
   * @returns {EditorLine[]} The lines that passed the filter function
   */
  filter (action) {
    return this.lines.filter (action);
  }

  /**
   * Retrieves the contents of all the lines in this collection as a single string.
   * @returns {string} The contents of this collection
   */
  getText () {
    return this.lines.map (line => line.content).join ('\n');
  }

  /**
   * Break the given text into lines and set those as the lines contained in this collection.
   *
   * @param {string} text The text to set in this collection
   */
  setText (text) {
    this.setLines (text.split (/[\r\n]/));
  }

  /**
   * Replace the contents of this collection with the given lines of text.
   *
   * @param {string[]} lines The lines to set in this collection
   */
  setLines (lines) {
    this.lines = lines.map ((line, index) => {
      return new EditorLine (this, index, line, true);
    });

    /* Make sure that we have atleast one line */
    if (this.lines.length === 0) {
      this.lines.push (new EditorLine (this, 0, ""));
    } else {
      /* Update the indentation and render each line */
      this.lines.forEach (line => {
        line.updateIndent ();
        line.computeRender ();
      });
    }

    this.indentRegions.update ();

    /* Notify the UI that the lines have changed */
    this.onLinesChanged ();
  }

  /**
   * Make sure that all the lines have the correct index.
   */
  renumerateLines () {
    this.lines.forEach ((line, index) => line.index = index);
  }

  /**
   * Insert a new line into this collection.
   * @param {number} index The index at which to insert the line
   * @param {EditorLine} line The line to insert into this collection
   */
  insertLine (index, line) {
    this.lines.splice (index, 0, line);
    this.renumerateLines ();
    this.onLinesChanged ();
  }

  /**
   * Delete a number of lines from this collection.
   * @param {number} index The index to start deleting from
   * @param {number} [count] The number of lines to delete (default: 1)
   */
  deleteLines (index, count) {
    this.lines.splice (index, typeof count === "number" ? count : 1);
    this.renumerateLines ();
    this.onLinesChanged ();
  }

  /**
   * Delete a single line from this collection.
   * @param {number} index The index of the line to delete
   */
  deleteLine (index) {
    this.deleteLines (index, 1);
  }

  /**
   * Test if the given index is a valid line index.
   * @param {number} index The index to test
   * @returns {boolean} Whether the given index is a valid line index
   */
  isValidLineIndex (index) {
    return index >= 0 && index < this.lines.length;
  }

  /**
   * Search through the lines in the collection to find the first line that contains
   * the given string or regular expression (see {@link EditorLine#contains}).
   *
   * @param {string|RegExp} value The value to search for
   * @param {number} [start] Optional start index (default 0)
   * @returns {number} The index of the first line that contains the given search (or -1)
   */
  findLineContains (value, start) {
    for (var i = start || 0; i < this.lines.length; i++) {
      if (this.lines[i].contains (value)) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Acquire the contents of a given region.
   *
   * @param {EditorRegion} region The region to extract
   * @returns {string[]} The content of the lines in the given region
   */
  acquireRegionContent (region) {
    var content = [];

    for (var i = region.startLine; i <= region.endLine; i++) {
      const line  = this.lines[i];
      const start = i === region.startLine ? region.startColumn : 0;
      const end   = i === region.endLine ? region.endColumn : line.length;

      content.push (line.content.substring (start, end));
    }

    return content;
  }

  /**
   * Remove a region of text from the collection.
   *
   * @param {EditorRegion} region The region to remove
   */
  removeRegion (region) {
    if (region.startLine === region.endLine) {
      this.lines[region.startLine].deleteText (region.startColumn, region.endColumn - region.startColumn);
    } else {
      if (region.endColumn === 0) {
        region.endLine--;
        region.endColumn = this.lines[region.endLine].length;
      }

      const start_line = this.lines[region.startLine];
      const end_line   = this.lines[region.endLine];
      const merged     = start_line.content.substring (0, region.startColumn) + end_line.content.substring (region.endColumn);

      this.deleteLines (region.startLine, region.endLine - region.startLine + 1);
      if (merged.length > 0) {
        const merge_line = new EditorLine (this, null, "", true);
        this.insertLine (region.startLine, merge_line);
        merge_line.setContent (merged);
      }
    }
  }

  /**
   * The collection of lines has changed.
   *
   * @emits LinesChanged
   */
  onLinesChanged () {
    this.indentRegions.update ();
    this.LinesChanged.fire ();
  }

  /**
   * This method is called by {@link EditorLine#onChanged} to notify any listeners
   * of this collection that a line has had its contents changed.
   *
   * @param {EditorLine} line The line whose content has changed
   * @emits LineContentChanged
   */
  onLineContentChanged (line) {
    this.LineContentChanged.fire (line);
  }
}
