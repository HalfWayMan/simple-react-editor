import { EditorEvent } from './EditorEvent.js';
import { EditorPosition } from './EditorPosition.js';

export class EditorViewMetrics {
  constructor (store) {
    /**
     * The store to which this set of metrics belongs
     * @type {EditorStore}
     */
    this.store = store;

    /**
     * The height of a line of text
     * @type {number}
     */
    this.lineHeight = 0;

    /**
     * The width of an individual character
     * @type {number}
     */
    this.charWidth = 0;

    /**
     * The height of the viewport
     * @type {number}
     */
    this.viewHeight = 0;

    /**
     * The top scroll offset of the viewport
     * @type {number}
     */
    this.scrollTop = 0;

    /**
     * Event that is fired when the height of a line changes
     * @type {EditorEvent}
     */
    this.LineHeightChanged = new EditorEvent ("EditorViewMetrics.LineHeightChanged");

    /**
     * Event that is fired when the character width changes
     * @type {EditorEvent}
     */
    this.CharWidthChanged = new EditorEvent ("EditorViewMetrics.CharWidthChanged");

    /**
     * Event that is fired when the view height changes
     * @type {EditorEvent}
     */
    this.ViewHeightChanged = new EditorEvent ("EditorViewMetrics.ViewHeightChanged");

    /**
     * Event that is fired when the view scroll position (`scrollTop`) is changed
     * @type {EditorEvent}
     * @param {number} prev_top The previous scroll position
     * @param {number} next_top The new scroll position
     */
    this.Scroll = new EditorEvent ("EditorViewMetrics.Scroll");
  }

  get scrollTopLine () {
    return Math.min (this.store.lines.length - 1, Math.max (0, Math.floor (this.scrollTop / this.lineHeight)));
  }

  get scrollBottomLine () {
    return this.scrollTopLine + (Math.ceil (this.viewHeight / this.lineHeight));
  }

  /**
   *
   * @param {number} scroll_top The new scroll position
   * @param {boolean} clamp_to_line Whether to clamp the position to a line
   * @emits Scroll
   */
  scrollTo (scroll_top, clamp_to_line) {
    const prev_top = this.scrollTop;
    this.scrollTop = Math.max (0, scroll_top);

    if (clamp_to_line) {
      this.scrollTop = Math.round (this.scrollTop / this.lineHeight) * this.lineHeight;
    }

    this.onScroll (prev_top, this.scrollTop);
  }

  /**
   * Scroll to the line with the given index (zero-based).
   *
   * Optionally this will center the view on the line at the given index.
   *
   * @param {number}  line     The index of the target line
   * @param {boolean} [center] Whether to center the view on the given line
   */
  scrollToLine (line, center) {
    const offset = line * this.lineHeight;

    if (center) {
      this.scrollTo (offset - this.viewHeight / 2, true);
    } else {
      this.scrollTo (offset, true)
    }
  }

  setViewHeight (height) {
    if (this.viewHeight !== height) {
      this.viewHeight = height;
      this.onViewHeightChanged ();
    }
  }

  setCharWidth (width) {
    if (this.charWidth !== width) {
      this.charWidth = width;
      this.onCharWidthChanged ();
    }
  }

  setLineHeight (height) {
    if (this.lineHeight !== height) {
      this.lineHeight = height;
      this.onLineHeightChanged ();
    }
  }

  clientToIndices (left, top) {
    return new EditorPosition (Math.floor (top / this.lineHeight), Math.round (left / this.charWidth));
  }

  indicesToClient (position) {
    var result = { left: 0, top: 0 };

    result.left = position.column * this.charWidth;
    result.top  = position.line * this.lineHeight;

    return result;
  }

  onScroll (prev_top, next_top) {
    this.Scroll.fire (prev_top, next_top);
  }

  onLineHeightChanged () {
    this.LineHeightChanged.fire ();
  }

  onCharWidthChanged () {
    this.CharWidthChanged.fire ();
  }

  onViewHeightChanged () {
    this.ViewHeightChanged.fire ();
  }
}
