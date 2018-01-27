import { EditorEvent } from './EditorEvent.js';
import { EditorRegion } from './EditorRegion.js';
import { EditorPosition } from './EditorPosition.js';
import { EditorLineCollection } from './EditorLineCollection.js';
import * as Syntax from './EditorSyntax.js';

export class EditorLineMarker {
  constructor (component, props) {
    this.component = component;
    this.props     = props || {};
  }
}

/**
 * A line of text in the editor.
 */
export class EditorLine {
  /**
   * Construct a new `EditorLine`.
   *
   * @param {EditorLineCollection} collection  The collection to which this line belongs
   * @param {number}               index       The index of the line (i.e. zero-based line number)
   * @param {string}               content     The content of the line
   * @param {boolean}              [no_update] If true, the constructor will not create the initial render state.
   */
  constructor (collection, index, content, no_update) {
    /**
     * The ID of this line
     * @type {number}
     */
    this.id = collection.nextLineId ();

    /**
     * The collection to which this line belongs
     * @type {EditorLineCollection}
     */
    this.collection = collection;

    /**
     * The index of the line (i.e. zero-based line number)
     * @type {number}
     */
    this.index = index;

    /**
     * The content of the line
     * @type {string}
     */
    this.content = content;

    /**
     * The identation of the line
     * @see {@link EditorLine#updateIndent}
     * @type {number}
     */
    this.indent = 0;

    /**
     * The gutter marker for this line (if any)
     * @type {EditorLineMarker?}
     * @default null
     */
    this.marker = null;

    this.syntaxIn  = 0;
    this.syntaxOut = 0;

    /**
     * The rendered content of this line (in HTML)
     * @type {string}
     * @see {@link EditorLine#computeRender}
     */
    this.render = "";

    /**
     * Whether this line's content has changed and needs to be re-rendered
     * @type {boolean}
     */
    this.dirty = true;

    /**
     * The rendered elements of this line
     * @type {SyntaxRegion[]}
     * @see {@link EditorLine#computeRender}
     */
    this.elements = [];

    /**
     * The content of this line has changed.
     * @type {EditorEvent}
     */
    this.ContentChanged = new EditorEvent ("EditorLine.ContentChanged");

    /**
     * The gutter marker for this line has changed.
     * @type {EditorEvent}
     */
    this.MarkerChanged = new EditorEvent ("EditorLine.MarkerChanged");

    if (!no_update) {
      this.updateIndent ();
      this.computeRender ();
    }
  }

  /**
   * Set the content of the line to a new value.
   *
   * This will update the indentation information for the line (via {@link EditorLine#updateIndent})
   * and also the render information (via {@link EditorLine#computeRender}), which may result in
   * subsequent lines being updated (see {@link EditorLine#computeRender} for more information).
   *
   * @param {string} content The new content for the line
   */
  setContent (content) {
    if (this.content !== content) {
      this.content = content;
      this.dirty   = true;
      this.updateIndent ();
      this.computeRender ();
      this.onContentChanged ();
    }
  }

  /**
   * Return the text content of this line from the given start column.
   * @param {number} start The start column
   * @returns {string}
   */
  getTextFrom (start) {
    return this.content.slice (start);
  }

  /**
   * Appends the given text to the line.
   * @param {string} text The text to append to this line
   */
  appendText (text) {
    this.setContent (this.content + text);
  }

  /**
   * Insert text at the given index.
   * @param {number} index The index at which to insert the text
   * @param {string} text  The text to insert at the given index
   */
  insertText (index, text) {
    if (index >= this.content.length) {
      this.setContent (this.content + text);
    } else {
      this.setContent (this.content.slice (0, index) + text + this.content.slice (index));
    }
  }

  /**
   * Deletes a number of characters at the given index.
   * @param {number} index The indext at which to start deleting characters
   * @param {number} count The number of characters to delete
   */
  deleteText (index, count) {
    this.setContent (this.content.slice (0, index) + this.content.slice (index + count));
  }

  /**
   * Delete all text from the given index forward.
   * @param {number} index The index to start deleting from
   */
  deleteTextFrom (index) {
    this.setContent (this.content.slice (0, index));
  }

  /**
   * Test whether the line contains the given string or regular expression.
   * @param {string|RegExp} value The value to search for
   * @returns {boolean} Whether the line contains the given value
   */
  contains (value) {
    if (typeof value === "string") {
      return this.content.indexOf (value) !== -1;
    } else if (value instanceof RegExp) {
      return value.test (this.content);
    } else return false;
  }

  /**
   * Test whether the lline contains the given string or regular expression in the given range.
   *
   * @param {string|RegExp} value The value to search for
   * @param {number}        start The start index
   * @param {number}        end   The end index
   * @returns {boolean} Whether the sub-region contains the given value
   */
  containsIn (value, start, end) {
    var region = this.content.substr (start, end - start);
    if (typeof value === "string") {
      return region.indexOf (value) !== -1;
    } else if (value instanceof RegExp) {
      return value.test (region);
    } else return false;
  }

  /**
   * Get the length of the line.
   * @returns {number} The length of the line in characters
   */
  get length () {
    return this.content.length;
  }

  /**
   * Returns a region that encloses this line.
   * @returns {EditorRegion} A region that encloses this line
   */
  get region () {
    return new EditorRegion (this.index, 0, this.index, this.content.length);
  }

  /**
   * Get the previous line to this one.
   * @returns {EditorLine} The previous line
   */
  get previous () {
    return this.collection.lines[this.index - 1] || null;
  }

  /**
   * Get the next line.
   * @returns {EditorLine} The next line
   */
  get next () {
    return this.collection.lines[this.index + 1] || null;
  }

  /**
   * Set the gutter marker for this line.
   * @param {EditorMarker?} marker The new marker for this line (or `null`)
   * @fires {MarkerChanged}
   */
  setMarker (marker) {
    this.marker = marker;
    this.onMarkerChanged ();
  }

  /**
   * Update the indentation information for this line by examining the space characters
   * at the start of the line content.
   */
  updateIndent () {
    var res = /^\s*/.exec (this.content);
    this.indent = res ? res[0].length : 0;
  }

  /**
   * Perform syntax rendering using the syntax engine assigned to our parent {@link EditorStore}.
   *
   * This will update the `elements` and `render` properties of the line.
   *
   * Note that if this is not the last line in the editor, and the state of the syntax highlight
   * engine ({@link EditorSyntaxEngine}) is not the same as the start state of the next line, then
   * the `computeRender` method is called on the next line automatically. This will also result
   * in the firing of the changed events for the next line (via {@link EditorLine#onContentChanged}).
   * The purpose of this is to make sure that if the syntax highlighter finishes this line in a
   * different state to when it started processing the previous line, the previous line is also
   * rendered. This ensures that changes to the state of the syntax engine cascade through the lines.
   * This is important when, for example, dealing with block-comments: when we have changed the content
   * of this line such that a block comment starts we need to cascade this style onto the subsequent
   * lines.
   */
  computeRender () {
    if (!this.dirty) {
      return;
    }

    const tab_size = this.collection.store.config.tabSize;
    const syntax   = this.collection.store.syntax;

    if (syntax) {
      const prev_line = this.previous;
      if (prev_line) {
        /* Our initial state is the state of our previous line's syntax engine at the end of rendering */
        this.syntaxIn = syntax.state = prev_line.syntaxOut;
      } else {
        /* We don't have a previous line */
        this.syntaxIn = syntax.state = 0;
      }

      const regions = syntax.highlightLine (this.content, null, tab_size);
      this.elements = regions.regions;
    } else {
      var region = new Syntax.SyntaxRegion (0);
      region.style = "plain";
      region.appendString (this.content);
      this.elements = [region];
    }

    var builder = [];
    this.elements.forEach (element => {
      builder.push ("<span");
      if (element.style) {
        builder.push (" class=\"");
        builder.push (element.style);
        builder.push ("\"");
      }

      builder.push (">");
      builder.push (element.html);
      builder.push ("</span>");
    });

    this.render = builder.join ('');
    this.dirty  = false;

    if (syntax) {
      this.syntaxOut = syntax.state;

      const next_line = this.next;
      if (next_line && next_line.syntaxIn !== syntax.state) {
        next_line.dirty = true;
        next_line.computeRender ();
        next_line.onContentChanged ();
      }
    }
  }

  /**
   * Test if the given column index contains an encapsulation character.
   *
   * @param {number} column The column to test for an encapsulator
   * @returns {boolean} Whether the given character contains an encapsulator
   */
  isEncapsulatorAt (column) {
    var char = this.content[column];
    return char === '[' || char === ']' || char === '{' || char === '}' || char === '(' || char === ')';
  }

  /**
   * Search backwards through this line to find an open encapsulator, starting at the
   * given column index This will also count any close encapsulators to ensure that
   * the correct open encapsulator is found (rather than just the immediate one).
   *
   * This method will iterate over any previous lines if the open encapsulator could not
   * be found in the contents of this line.
   *
   * @param {number} start The start column to work backwards from
   * @returns {EditorPosition} The position of the previous open encapsulator (or `null`)
   */
  getPreviousEncapsulator (start) {
    var line  = this;
    var count = 0;

    while (line !== null) {
      for (var i = start; i >= 0; i--) {
        const char = line.content[i];

        if (char === '{' || char === '(' || char === '[') {
          count--;
          if (!count) {
            return new EditorPosition (line.index, i);
          }
        } else if (char === '}' || char === ')' || char === ']') {
          count++;
        }
      }

      line  = line.previous;
      start = line.length - 1;
    }

    return null;
  }

  /**
   * Search forwards through this line to find a close encapsulator, starting at the
   * given column index. This will also count any open encapsulators to ensure that
   * the correct close encapsulator is found (rather than just the immediate first).
   *
   * This method will iterate over any subsequent lines if the close encapsulator could
   * not be found in this line.
   *
   * @param {number} start The start column to work from
   * @returns {EditorPosition} The position of the next close encapsulator (or `null`)
   */
  getNextEncapsulator (start) {
    var line  = this;
    var count = 0;

    while (line !== null) {
      for (var i = start; i < line.content.length; i++) {
        const char = line.content[i];

        if (char === '}' || char === ')' || char === ']') {
          count--;
          if (!count) {
            return new EditorPosition (line.index, i);
          }
        } else if (char === '{' || char === '(' || char === '[') {
          count++;
        }
      }

      line  = line.next;
      start = 0;
    }

    return null;
  }

  /**
   * Find the previous word start from the given position.
   *
   * This method will search backwards from the given index (or the end of the line) to find
   * the start of the previous word. If the `recurse` parameter is `true`, the method will
   * recurse over the previous line.
   *
   * @param {number} [start] The start index
   * @param {boolean} [recurse] Whether to recurse through previous lines
   * @returns {EditorPosition?} The position of the previous word start (or `null`)
   */
  findPreviousWordStart (start, recurse) {
    if (typeof start !== "number") {
      start = this.length;
    }

    const prefix = Array.from (this.content.substring (0, start)).reverse ().join ('');
    const result = /\W*\w+/.exec (prefix);

    if (result) {
      return new EditorPosition (this.index, start - result[0].length);
    } else return recurse ? this.previous.findPreviousWordStart (null, true) : null;
  }

  /**
   * Find the next word end from the given position.
   *
   * This method will search forwards from the given index (or the start of the line) to find
   * the end of the next word. If the `recurse` parameter is `true`, the method will
   * recurse over the next line.
   *
   * @param {number} [start] The start index
   * @param {boolean} [recurse] Whether to recurse through next lines
   * @returns {EditorPosition?} The position of the next word end (or `null`)
   */
  findNextWordEnd (start, recurse) {
    if (typeof start !== "number") {
      start = 0;
    }

    const rest   = this.content.substring (start);
    const result = /\W*\w+/.exec (rest);

    if (result) {
      return new EditorPosition (this.index, start + result[0].length);
    } else return recurse ? this.next.findNextWordEnd (null, true) : null;
  }

  /**
   * When a method in this class changes the contents of the line and that results in a
   * requirement to re-render the display, this method is called to fire the {@link EditorLine#ContentChanged}
   * event.
   *
   * In addition, this method will call {@link EditorLineCollection#onLineContentChanged}.
   *
   * @emits ContentChanged
   */
  onContentChanged () {
    this.ContentChanged.fire ();
    this.collection.onLineContentChanged (this);
  }

  /**
   * When the marker for this line has changed, this method is called to fire the {@link EditorLine#MarkerChanged} event.
   *
   * @emits MarkerChanged
   */
  onMarkerChanged () {
    this.MarkerChanged.fire ();
  }
}
