/**
 * A clipboard for a cursor.
 */
export class EditorClipboard {
  /**
   * Create a new `EditorClipboard` instance.
   * @param {boolean} [primary] Whether this clipboard should try and interact with the browser
   */
  constructor (primary) {
    /**
     * The content of this clipboard
     * @type {string}
     */
    this.content = null;

    /**
     * Whether this should interact with the desktop clipboard
     * @type {boolean}
     */
    this.primary = primary || false;

    /**
     * The proxy element we use to communicate with the desktop clipboard
     * @type {HTMLTextAreaElement}
     */
    this.proxy   = null;

    if (this.primary) {
      this.createProxyElement ();
    }
  }

  /**
   * Create a clipboard proxy element (a `<textarea>`).
   *
   * https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
   *
   * @returns {HTMLTextAreaElement}
   */
  createProxyElement () {
    return null;
  }

  /**
   * Write a value into the clipboard.
   * @param {string} text The text value to save to the clipboard
   */
  write (text) {
    this.content = text;
  }

  /**
   * Read a value from the clipboard.
   * @returns {string} The content of the clipboard
   */
  read () {
    return this.content;
  }
}
