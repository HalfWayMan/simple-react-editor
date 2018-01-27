import { EditorRegion } from './EditorRegion.js';

/**
 * Represents a selection for a cursor.
 */
export class EditorSelection {
  /**
   * Construct a new `EditorSelection`.
   * @param {EditorPosition} pivot The pivot position for the selection.
   */
  constructor (pivot) {
    /**
     * The pivot position of the selection (not necessarily within the selection region)
     * @type {EditorPosition}
     */
    this.pivot = pivot;

    /**
     * The region described by this selection
     * @type {EditorRegion}
     */
    this.region = EditorRegion.fromPosition (this.pivot);
  }

  /**
   * Adjust this selection for the given location. Essentially expanding the
   * selection forwards or backwards of the pivot point towards the given
   * position.
   *
   * @param {EditorPosition} pos The position to expand the selection to
   */
  adjust (pos) {
    if (pos.isBeforeOrEqual (this.pivot)) {
      this.region.set (pos.line, pos.column, this.pivot.line, this.pivot.column);
    } else {
      this.region.set (this.pivot.line, this.pivot.column, pos.line, pos.column);
    }
  }

  /**
   * Create a new selection from the given region.
   *
   * The pivot for the new `EditorSelection` is assumed to be the start of the
   * region.
   *
   * @param {EditorRegion} region The region for the new selection
   * @returns {EditorSelection} The new selection for the given region
   */
  static fromRegion (region) {
    var selection = new EditorSelection (region.start);
    selection.region = region.clone ();
    return selection;
  }

  /**
   * Create a new selection from the given start and end positions.
   *
   * The pivot for the new `EditorSelection` is assumed to be the start of the
   * region described by the two positions.
   *
   * @param {EditorPosition} start The start of the new selection
   * @param {EditorPosition} end The end of the new selection
   * @returns {EditorSelection} The new selection for the given region
   */
  static fromPositions (start, end) {
    var selection = new EditorSelection (start);
    selection.region = EditorRegion.fromPositions (start, end);
    return selection;
  }
}
