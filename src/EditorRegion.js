import { EditorPosition } from './EditorPosition.js';

/**
 * A region in the editor.
 *
 * A region is defined by a start line and column and an end line and column.
 */
export class EditorRegion {
  /**
   * Create a new `EditorRegion`.
   *
   * @param {number} start_line Start line
   * @param {number} start_col  Start column
   * @param {number} end_line   End line
   * @param {number} end_col    End column
   */
  constructor (start_line, start_col, end_line, end_col) {
    /** @type {number} */
    this.startLine   = start_line;
    /** @type {number} */
    this.startColumn = start_col;
    /** @type {number} */
    this.endLine     = end_line;
    /** @type {number} */
    this.endColumn   = end_col;
  }

  /**
   * Clone this region.
   * @returns {EditorRegion} A new region with the same start and end locations
   */
  clone () {
    return new EditorRegion (this.startLine, this.startColumn, this.endLine, this.endColumn);
  }

  /**
   * Returns a string representation of this region.
   *
   * @example
   * new EditorRegion (1, 100, 2, 4).toString ();
   * // result: "[1:100,2:4]"
   */
  toString () {
    return "[" + this.startLine + ":" + this.startColumn + "," + this.endLine + ":" + this.endColumn + "]";
  }

  /**
   * Test if this position is an empty position.
   *
   * An empty position is one which describes a zero region: both the start and end points are the same.
   *
   * @type {boolean} Whether this is an empty region.
   */
  get empty () {
    return this.startLine === this.endLine && this.startColumn === this.endColumn;
  }

  /**
   * Set this region to the given arguments.
   *
   * @param {number} start_line  Start line
   * @param {number} start_col   Start column
   * @param {number} end_line    End line
   * @param {number} end_col     End column
   */
  set (start_line, start_col, end_line, end_col) {
    this.startLine   = start_line;
    this.startColumn = start_col;
    this.endLine     = end_line;
    this.endColumn   = end_col;
  }

  /**
   * Create an empty region from the given position. The start and end of the returned region are the same position.
   *
   * @param {EditorPosition} position The start and end position of the region
   * @returns {EditorRegion} A new region
   */
  static fromPosition (position) {
    return new EditorRegion (position.line, position.column, position.line, position.column);
  }

  /**
   * Create a new region from the two positions: being the start and end positions of the region.
   *
   * @param {EditorPosition} start The start position
   * @param {EditorPosition} end   The end position
   * @returns {EditorRegion} A new region
   */
  static fromPositions (start, end) {
    return new EditorRegion (start.line, start.column, end.line, end.column);
  }

  /**
   * Get the start row and column of this region as an `EditorPosition`.
   * @type {EditorPosition} The start position of the region
   */
  get start () {
    return new EditorPosition (this.startLine, this.startColumn);
  }

  /**
   * Set the start row and column of this region from an `EditorPosition`.
   * @param {EditorPosition} pos The position to set as the start of this region
   */
  set start (pos) {
    this.startLine   = pos.line;
    this.startColumn = pos.column;
  }

  /**
   * Get the end row and column of this region as an `EditorPosition`.
   * @type {EditorPosition} The end position of the region.
   */
  get end () {
    return new EditorPosition (this.endLine, this.endColumn);
  }

  /**
   * Set the end row and column of this region from an `EditorPosition`.
   * @param {EditorPosition} pos The position to set as the end of this region
   */
  set end (pos) {
    this.endLine   = pos.line;
    this.endColumn = pos.column;
  }

  /**
   * Test whether this region contains the given position.
   * @param {EditorPosition} pos The position to test
   * @returns {boolean} Whether the position is contained within this region
   */
  contains (pos) {
    if (pos.line < this.startLine || pos.line > this.endLine) {
      return false;
    }

    if (pos.line === this.startLine && pos.column < this.startColumn) {
      return false;
    }

    if (pos.line === this.endLine && pos.column > this.endColumn) {
      return false;
    }

    return true;
  }
}
