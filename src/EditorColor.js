/**
 * An RGB color
 */
export class EditorColor {
  /**
   * Construct a new `EditorColor`.
   * @param {number} r Red component
   * @param {number} g Green component
   * @param {number} b Blue component
   */
  constructor (r, g, b) {
    /** @type {number} */
    this.r = r;
    /** @type {number} */
    this.g = g;
    /** @type {number} */
    this.b = b;
  }

  /**
   * Parse the given string as a three- or six-digit hexadecimal color.
   * @param {string} str The string to parse
   * @returns {EditorColor} The parsed color
   * @throws {Error} If the parse failed
   */
  static fromHex (str) {
    var result = EditorColor.Expressions.HEX3.exec (str);
    if (result) {
      var r = parseInt (result[1], 16);
      var g = parseInt (result[2], 16);
      var b = parseInt (result[3], 16);

      return new EditorColor (r << 4 + r, g << 4 + g, b << 4 + b);
    } else {
      result = Expressions.HEX6.exec (str);
      if (result) {
        return new EditorColor (parseInt (result[1], 16), parseInt (result[2], 16), parseInt (result[3], 16));
      } else {
        throw new Error ("Invalid hex color '" + str + "'");
      }
    }
  }

  /**
   * Parse the given string as an RGB color.
   * @param {string} str The string to parse
   * @returns {EditorColor} The parsed color
   * @throws {Error} If the parse fails
   */
  static fromRGB (str) {
    var result = EditorColor.Expressions.RGB.exec (str);
    if (result) {
      return new EditorColor (parseInt (result[1], 10), parseInt (result[2], 10), parseInt (result[3], 10));
    } else {
      throw new Error ("Invalid RGB color '" + str + "'");
    }
  }

  /**
   * A set of regular expressions that match the color strings we can parse.
   */
  static Expressions = {
    /**
     * A regular expression to match 3-digit hexadecimal colors of the form `#123`.
     */
    HEX3: /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,
    /**
     * A regular expression to match 6-digit hexadecimal colors of the form `#1a2b3c`.
     */
    HEX6: /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
    /**
     * A regular expression to match RGB colors of the form `rgb (123, 456, 789)`.
     */
    RGB:  /^rgb\s*\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/
  }
}
