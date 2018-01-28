import { EditorIdGenerator } from './EditorTools.js';
import { EditorEvent } from './EditorEvent.js';
import { EditorStore } from './EditorStore.js';
import { EditorCursor } from './EditorCursor.js';

/**
 * A collection of cursors.
 */
export class EditorCursorCollection {
  /**
   * Construct a new `EditorCursorCollection`
   *
   * @param {EditorStore} store The store to which this collection belongs
   */
  constructor (store) {
    /**
     * The store to which this collection belongs
     * @type {EditorStore}
     */
    this.store = store;

    /**
     * The ID generator for cursors
     * @type {EditorIdGenerator}
     */
    this.nextId = new EditorIdGenerator ();

    /**
     * The primary cursor
     * @type {EditorCursor}
     */
    this.primary = new EditorCursor (this, this.nextId (), true);

    /**
     * Array of secondary cursors
     * @type {EditorCursor[]}
     */
    this.secondary = [];

    /**
     * Index of the last secondary cursor we added
     * @type {number}
     */
    this.lastAdded = 0;

    /**
     * Event that is fired to make the cursors blink in sync
     * @type {EditorEvent}
     */
    this.Blink = new EditorEvent ("EditorCursorCollection.Blink");

    /**
     * The current index of the blink (on or off)
     * @type {boolean}
     */
    this.blinkIndex = false;

    /**
     * The blinker interval
     * @type {number?}
     */
    this.blinkInterval = null;

    /**
     * Event that is fired when a new cursor is added to the collection
     * @type {EditorEvent}
     * @param {EditorCursor} cursor The cursor that was added to the collection
     */
    this.CursorAdded = new EditorEvent ("EditorCursorCollection.CursorAdded");

    /**
     * Event that is fired when a cursor is removed from the collection
     * @type {EditorEvent}
     * @param {EditorCursor} cursor The cursor that was removed from the collection
     */
    this.CursorRemoved = new EditorEvent ("EditorCursorCollection.CursorRemoved");

    /**
     * Event that is fired when a cursor has changed
     * @type {EditorEvent}
     * @param {EditorCursor} cursor The cursor that was changed
     */
    this.CursorChanged = new EditorEvent ("EditorCursorCollection.CursorChanged");
  }

  /**
   * Sort the secondary cursors into ascending row-order.
   */
  sortSecondary () {
    this.secondary.sort ((a, b) => a.position.line - b.position.line);
  }

  /**
   * Add a new secondary cursor.
   *
   * @param {EditorCursor} cursor The new secondary cursor
   */
  addCursor (cursor) {
    cursor.id = this.nextId ();
    this.secondary.push (cursor);
    this.sortSecondary ();
    this.lastAdded = this.secondary.indexOf (cursor);
    this.onCursorAdded (cursor);
  }

  /**
   * Remove a secondary cursor.
   *
   * @param {EditorCursor} cursor Cursor to remove from the collection
   */
  removeCursor (cursor) {
    this.removeCursorAt (this.secondary.indexOf (cursor));
  }

  /**
   * Remove a secondary cursor at the given index.
   *
   * @param {number} index The index of the secondary cursor to remove
   */
  removeCursorAt (index) {
    var cursor = this.secondary[index];
    if (this.lastAdded >= index + 1) {
      this.lastAdded--;
    }

    cursor.id = null;
    this.secondary.splice (index, 1);
    this.onCursorRemoved (cursor);
  }

  /**
   * Remove all secondary cursors.
   */
  removeSecondary () {
    var old_secondary = this.secondary;
    this.secondary = [];

    old_secondary.forEach (cursor => this.onCursorRemoved (cursor));
  }

  /**
   * Get the index of the last added secondary cursor (or the primary cursor)
   */
  getLastAddedIndex () {
    if (this.secondary.length === 0 || this.lastAdded === 0) {
      return 0;
    } else return this.lastAdded;
  }

  /**
   * Get an array of all cursors including the primary cursor.
   * @returns {EditorCursor[]} All the cursors in the collection
   */
  getAll () {
    var result = [ this.primary ];
    this.secondary.forEach (cursor => result.push (cursor));
    return result;
  }

  /**
   * Get the cursor at the lowest line number.
   * @type {EditorCursor} The cursor on the lowest line number
   */
  get lowest () {
    if (this.secondary.length === 0) {
      return this.primary;
    } else {
      var secondary = this.secondary[0];
      if (this.primary.position.isBefore (secondary.position)) {
        return this.primary;
      } else return secondary;
    }
  }

  /**
   * Get the cursor at the highest line number.
   * @type {EditorCursor} The cursor on the highest line number
   */
  get highest () {
    if (this.secondary.length === 0) {
      return this.primary;
    } else {
      var secondary = this.secondary[this.secondary.length - 1];
      if (!this.primary.position.isBeforeOrEqual (secondary.position)) {
        return this.primary;
      } else return secondary;
    }
  }

  /**
   * Perform an operation on each cursor.
   *
   * @param {Function} action The action to perform on each cursor
   */
  forEach (action) {
    action (this.primary, 0);
    this.secondary.forEach ((secondary, index) => action (secondary, 1 + index));
  }

  /**
   * Map a function over each cursor in the collection and collect the
   * results.
   *
   * @param {Function} action The action to perform on each cursor
   * @returns {*[]} The results from calling the function on each cursor
   */
  map (action) {
    var results = [ action (this.primary, 0) ];
    this.secondary.forEach ((secondary, index) => results.push (action (secondary, 1 + index)));
    return results;
  }

  /**
   * Stop the blink timer (setting it's index to the given value, falling
   * back to `false` if no value is provided).
   *
   * @param {boolean} [index] The new value for the blinker index (default: `false`)
   */
  stopBlink (index) {
    window.clearInterval (this.blinkInterval);
    this.blinkInterval = null;
    this.blinkIndex    = index || false;
    this.onBlink (this.blinkIndex);
  }

  /**
   * Start the blink timer, setting the blink index to the given value, falling
   * back to `false` if no value is provided.
   *
   * @param {boolean} [index] The new value for the blinker index (default: `false`)
   */
  startBlink (index) {
    if (this.blinkInterval) {
      window.clearInterval (this.blinkInterval);
    }

    this.blinkIndex = index || false;
    this.onBlink (this.blinkIndex);

    this.blinkInterval = window.setInterval (() => {
      this.blinkIndex = !this.blinkIndex;
      this.onBlink (this.blinkIndex);
    }, 500);
  }

  /**
   * Fires the {@link EditorCursorCollection#Blink} event with the given argument.
   *
   * @param {boolean} index The current blink index
   */
  onBlink (index) {
    this.Blink.fire (index);
  }

  /**
   * A cursor was added to the collection.
   *
   * Fires the {@link EditorCursorCollection#CursorAdded} event.
   *
   * @param {EditorCursor} cursor The cursor that was added
   */
  onCursorAdded (cursor) {
    this.startBlink (true);
    this.CursorAdded.fire (cursor);
  }

  /**
   * A cursor that was removed from the collection.
   *
   * Fires the {@link EditorCursorCollection#CursorRemoved} event.
   *
   * @param {EditorCursor} cursor The cursor that was removed
   */
  onCursorRemoved (cursor) {
    this.startBlink (true);
    this.CursorRemoved.fire (cursor);
  }

  /**
   * A cursor was changed.
   *
   * Fires the {@link EditorCursorCollection#CursorChanged} event.
   *
   * @param {EditorCursor} cursor The cursor that has changed
   */
  onCursorChanged (cursor) {
    this.startBlink (true);
    this.CursorChanged.fire (cursor);
  }
}
