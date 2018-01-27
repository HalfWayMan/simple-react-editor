import { EditorEvent } from './EditorEvent.js';
import { EditorLineCollection } from './EditorLineCollection.js';

/**
 * Tracks indentation regions within the {@link EditorLineCollection} contents.
 */
export class EditorIndentRegions {
  /**
   * Construct a new `EditorIndentRegions` instance.
   *
   * This will automatically call the {@link EditorIndentRegions#update} method to update
   * the regions in this class based on the current content of the {@link EditorLineCollection}.
   *
   * @param {EditorLineCollection} collection The editor collection to track indentation
   */
  constructor (collection) {
    /**
     * The current collection to which we are attached.
     * @type {EditorLineCollection}
     */
    this.collection = collection;

    /**
     * The regions that we have extracted from the collection contents.
     * @type {IndentColumn[]}
     */
    this.regions = [];

   /**
     * The regions in this collection have changed
     * @type {EditorEvent}
     */
    this.Changed = new EditorEvent ("EditorIndentRegions.Changed");

    this.update ();
  }

  /**
   * Map a function over the {@link IndentColumn} array in `regions` member.
   *
   * @param {Function} action The action to map over all the regions
   * @returns {*[]} Results from calling `action` for each `IndentColumn`
   */
  map (action) {
    return this.regions.map (action);
  }

  /**
   * Update the regions in this `EditorIndentRegions` by scanning the contents of
   * the {@link EditorLineCollection} to which we are attached.
   *
   * @emits EditorIndentRegions#Changed
   */
  update () {
    const collection = this.collection;
    var   regions    = [];

    collection.forEach (line => {
      if (line.indent > 0) {
        var index = line.indent / collection.store.config.tabSize;

        for (var column = 0; column < index; column++) {
          if (column > regions.length - 1) {
            regions.push ([{ start: line.index, end: line.index }]);
          } else {
            var blocks = regions[column];
            var block  = blocks[blocks.length - 1];

            if (block.end === line.index - 1) {
              /* Previous line was indented at this column; extend the block */
              block.end = line.index;
            } else {
              /* Previous line was not indented at this column; create a new block */
              blocks.push ({ start: line.index, end: line.index });
            }
          }
        }
      } else if (line.content.length === 0 || line.contains (/^\s*$/)) {
        /* Line is empty or just full of whitespace; extend all blocks from previous line
         * down through this blank line */
        regions.forEach (blocks => {
          var last_block = blocks[blocks.length - 1];
          if (last_block.end === line.index - 1) {
            last_block.end = line.index;
          }
        });
      }
    });

    this.regions = regions;
    this.Changed.fire ();
  }
}

/**
 * An `IndentColumn` describes a single column of indentation, spanning the entire
 * vertical of the contents of the {@link EditorLineCollection}.
 *
 * Each element of the `IndentColumn` is an {@link IndentBlock}, which describes the
 * identified vertical regions of indentation found in the contents of the store.
 *
 * @typedef {IndentBlock[]} IndentColumn
 */

/**
 * @typedef {Object} IndentBlock
 * @property {number} start The start row of an identified indentation region
 * @property {number} end   The end row of the identation region
 */
