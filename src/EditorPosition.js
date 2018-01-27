/**
 * A row and column position in the editor.
 */
export class EditorPosition {
  /**
    * Construct a new EditorPosition.
    *
    * @param {number} line   The line number to initialise the position
    * @param {number} column The column number to initialise the position
    */
   constructor (line, column) {
    /** @type {number} */
    this.line = line;
    /** @type {number} */
    this.column = column;
  }

  /**
   * Create a new position that has the same row and column as this one.
   */
  clone () {
    return new EditorPosition (this.line, this.column);
  }

  /**
   * Returns a string representation of the position.
   *
   * @example
   * new EditorPosition (10, 100).toString ();
   * // result: "(10:100)"
   *
   * @returns {string} A string representation of the position
   */
  toString () {
    return "(" + this.line + ":" + this.column + ")";
  }

  /**
   * Test if this position is equal to another.
   *
   * @param {EditorPosition} other The position to test against
   * @returns {boolean} Whether the two positions are equal
   */
  equals (other) {
    return other.line === this.line && other.column === this.column;
  }

  /**
   * Test if this position is before the argument position.
   *
   * @param {EditorPosition} other The position to test against
   * @returns {boolean} Whether this position is before the argument position
   */
  isBefore (other) {
    if (this.line < other.line) {
      return true;
    }

    if (this.line > other.line) {
      return false;
    }

    return this.column < other.column;
  }

  /**
   * Test if this position is before or equal to the other position
   *
   * @param {EditorPosition} other The position to test against
   * @returns {boolean} Whether this position is before or eqial to the argument position
   */
  isBeforeOrEqual (other) {
    if (this.line < other.line) {
      return true;
    }

    if (this.line > other.line) {
      return false;
    }

    return this.column <= other.column;
  }
}
