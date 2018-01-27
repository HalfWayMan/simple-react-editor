import { EditorEvent } from './EditorEvent.js';
import { EditorColor } from './EditorColor.js';

/**
 * Encapsulates the theme colors for the editor.
 *
 * This class contains the colors that we extract from the editor DOM under the active CSS theme.
 * These color values are then used when rendering the non-CSS-styled elements of the editor, such
 * as the minimap.
 */
export class EditorTheme {
  /**
   * Construct a new `EditorTheme`.
   *
   * The majority of the color properties of the new `EditorTheme` will be set to white; apart from
   * the background color which will be set to black. Use the {@see EditorTheme#extractFromDOM}
   * method to populate by sampling the current editor DOM.
   */
  constructor () {
    /**
     * The editor background color (default `#000`).
     * @type {EditorColor}
     */
    this.background = new EditorColor (0, 0, 0);

    /**
     * Whitespace character color (default `#fff`).
     * @type {EditorColor}
     */
    this.whitespace = new EditorColor (255, 255, 255);

    /**
     * Plain text color (default `#fff`).
     * @type {EditorColor}
     */
    this.plain = new EditorColor (255, 255, 255);

    /**
     * Comment color (default `#fff`).
     * @type {EditorColor}
     */
    this.comment = new EditorColor (255, 255, 255);

    /**
     * Reserved word color (default `#fff`)
     * @type {EditorColor}
     */
    this.reserved = new EditorColor (255, 255, 255);

    /**
     * Identifier color (default `#fff`)
     * @type {EditorColor}
     */
    this.identifier = new EditorColor (255, 255, 255);

    /**
     * Typename color (default `#fff`)
     * @type {EditorColor}
     */
    this.typename = new EditorColor (255, 255, 255);

    /**
     * String/character literal color (default `#fff`)
     * @type {EditorColor}
     */
    this.string = new EditorColor (255, 255, 255);

    /**
     * String/character literal escape code color (default `#fff`)
     * @type {EditorColor}
     */
    this.escape = new EditorColor (255, 255, 255);

    /**
     * Number color (default `#fff`)
     * @type {EditorColor}
     */
    this.number = new EditorColor (255, 255, 255);

    /**
     * Regular expression color (default `#fff`)
     * @type {EditorColor}
     */
    this.regexp = new EditorColor (255, 255, 255);

    /**
     * Event that is fired when the theme colors have been changed.
     * @type {EditorEvent}
     */
    this.Changed = new EditorEvent ("EditorTheme.Changed");
  }

  /**
   * Extract the theme colors from the DOM.
   *
   * This function expects to be passed an element that supports the `lines` class. That is, it should
   * be the `<div>` with the class `lines` that we find in the editor DOM.
   *
   * @param {Element} lines The element within the editor DOM that encapsulates the lines
   * @emits {Changed}
   */
  extractFromDOM (lines) {
    var faux_line = document.createElement ("div");
    faux_line.className     = "line";
    faux_line.style.display = "none";
    lines.appendChild (faux_line);

    var span = document.createElement ("span");
    faux_line.appendChild (span);

    this.background = EditorColor.fromRGB (window.getComputedStyle (lines).backgroundColor);
    this.plain      = EditorColor.fromRGB (window.getComputedStyle (lines).color);

    const get_from_class = (classname) => {
      span.className = classname;
      return EditorColor.fromRGB (window.getComputedStyle (span).color);
    };

    this.comment    = get_from_class ("comment");
    this.reserved   = get_from_class ("reserved");
    this.identifier = get_from_class ("identifier");
    this.typename   = get_from_class ("typename");
    this.string     = get_from_class ("string");
    this.escape     = get_from_class ("escape");
    this.number     = get_from_class ("number");
    this.regexp     = get_from_class ("regexp");

    lines.removeChild (faux_line);
    this.onChanged ();
  }

  /**
   * Called when the theme colors have changed.
   * @emits {Changed}
   */
  onChanged () {
    this.Changed.fire ();
  }
}
