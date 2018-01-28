import { EditorEvent } from './EditorEvent.js';

/**
 * The minimap renderer.
 */
export class EditorMinimap {
  /**
   * Construct an `EditorMinimap`.
   *
   * @param {EditorStore}       store  The store to which this minimap is attached
   * @param {HTMLCanvasElement} canvas The canvas element that we are to render to
   */
  constructor (store, canvas) {
    /**
     * The `EditorStore` to which this minimap is attached
     * @type {EditorStore}
     */
    this.store = store;

    /**
     * The canvas to which we render
     * @type {HTMLCanvasElement}
     */
    this.canvas = canvas;

    var crect = canvas.getBoundingClientRect ();

    /**
     * The width of the minimap
     * @type {number}
     */
    this.width = crect.width;

    /**
     * The height of the minimap
     * @type {number}
     */
    this.height = crect.height;

    /**
     * The 2D rendering context
     * @type {Context}
     */
    this.context = canvas.getContext ("2d");

    /**
     * The image buffer to whic hwe render
     * @type {ImageData}
     */
    this.buffer = null;

    /**
     * The start line of the minimap
     * @type {number}
     */
    this.lineStart = 0;

    /**
     * The end line of the minimap
     * @type {number}
     */
    this.lineEnd = 0;

    /**
     * The height of the slider
     * @type {number}
     */
    this.sliderHeight = 0;

    /**
     * The maximum top value of the slider.
     *
     * That is, the maximum value that we should set as the `top` value of the slider.
     *
     * @type {number}
     */
    this.sliderMaxTop = 0;

    /**
     * The current top value of the slider
     * @type {number}
     */
    this.sliderTop = 0;

    /**
     * The fractional component of the slider
     * @type {number}
     */
    this.sliderRatio = 0;

    /**
     * Event that is fired when the slider position changes.
     * @type {EditorEVent}
     */
    this.SliderChanged = new EditorEvent ("EditorMinimap.SliderChanged");

    this.store.lines.LinesChanged.bindTo (this, this.onLinesChanged);
    this.store.lines.LineContentChanged.bindTo (this, this.onLineContentChanged);
    this.store.viewMetrics.Scroll.bindTo (this, this.onScroll);
  }

  /**
   * The minimum character code
   * @type {number}
   */
  static MIN_CHAR = 32;

  /**
   * The maximum character code
   * @type {number}
   */
  static MAX_CHAR = 126;

  /**
   * The number of characters in the character data
   * @type {number}
   */
  static NUM_CHARS = 1 + (EditorMinimap.MAX_CHAR - EditorMinimap.MIN_CHAR);

  /**
   * The width of a character in the minimap
   * @type {number}
   */
  static CHAR_WIDTH = 2;

  /**
   * The height of a character in the minimap
   * @type {number}
   */
  static CHAR_HEIGHT = 4;

  /**
   * The character data
   * @type {number[]}
   */
  static CHAR_DATA = [
    /*  32   */ 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, /*  33 ! */ 0x1e, 0x1f, 0x27, 0x29,  0x17, 0x18, 0x03, 0x03,
    /*  34 " */ 0x35, 0x35, 0x18, 0x18,  0x00, 0x00, 0x00, 0x00, /*  35 # */ 0x25, 0x34, 0x71, 0x81,  0x83, 0x6f, 0x06, 0x03,
    /*  36 $ */ 0x28, 0x43, 0x55, 0x3c,  0x33, 0x79, 0x0b, 0x18, /*  37 % */ 0x4c, 0x06, 0x65, 0x3c,  0x13, 0x8a, 0x00, 0x04,
    /*  38 & */ 0x3f, 0x22, 0x6c, 0x27,  0x5e, 0x93, 0x09, 0x0d, /*  39 ' */ 0x19, 0x1c, 0x0b, 0x0d,  0x00, 0x00, 0x00, 0x00,
    /*  40 ( */ 0x08, 0x35, 0x3d, 0x11,  0x32, 0x1b, 0x01, 0x28, /*  41 ) */ 0x32, 0x0b, 0x0a, 0x44,  0x14, 0x39, 0x28, 0x02,
    /*  42 * */ 0x2e, 0x35, 0x39, 0x41,  0x00, 0x00, 0x00, 0x00, /*  43 + */ 0x04, 0x05, 0x50, 0x58,  0x27, 0x2e, 0x00, 0x00,
    /*  44 , */ 0x00, 0x00, 0x00, 0x00,  0x14, 0x1c, 0x26, 0x0c, /*  45 - */ 0x00, 0x00, 0x0e, 0x0f,  0x15, 0x17, 0x00, 0x00,
    /*  46 . */ 0x00, 0x00, 0x00, 0x00,  0x16, 0x1b, 0x03, 0x04, /*  47 / */ 0x00, 0x3a, 0x11, 0x3e,  0x4d, 0x02, 0x25, 0x00,
    /*  48 0 */ 0x46, 0x46, 0x62, 0x68,  0x5b, 0x58, 0x08, 0x0a, /*  49 1 */ 0x35, 0x38, 0x07, 0x4d,  0x21, 0x66, 0x09, 0x0e,
    /*  50 2 */ 0x3e, 0x46, 0x02, 0x56,  0x64, 0x31, 0x0c, 0x0d, /*  51 3 */ 0x38, 0x46, 0x1c, 0x65,  0x2f, 0x63, 0x13, 0x05,
    /*  52 4 */ 0x0c, 0x56, 0x44, 0x54,  0x40, 0x79, 0x00, 0x06, /*  53 5 */ 0x54, 0x33, 0x4b, 0x47,  0x2d, 0x62, 0x14, 0x08,
    /*  54 6 */ 0x41, 0x35, 0x79, 0x48,  0x57, 0x5e, 0x08, 0x08, /*  55 7 */ 0x3f, 0x62, 0x01, 0x52,  0x38, 0x1e, 0x06, 0x00,
    /*  56 8 */ 0x44, 0x4a, 0x5d, 0x62,  0x60, 0x62, 0x06, 0x08, /*  57 9 */ 0x49, 0x48, 0x5d, 0x74,  0x27, 0x66, 0x10, 0x07,
    /*  58 : */ 0x00, 0x00, 0x1a, 0x25,  0x14, 0x1d, 0x03, 0x04, /*  59 ; */ 0x00, 0x00, 0x19, 0x25,  0x11, 0x1f, 0x23, 0x0e,
    /*  60 < */ 0x00, 0x01, 0x49, 0x4c,  0x2c, 0x4d, 0x00, 0x00, /*  61 = */ 0x00, 0x00, 0x45, 0x4d,  0x37, 0x3d, 0x00, 0x00,
    /*  62 > */ 0x01, 0x00, 0x44, 0x51,  0x46, 0x34, 0x00, 0x00, /*  63 ? */ 0x2e, 0x4d, 0x0a, 0x4e,  0x1e, 0x1e, 0x03, 0x03,
    /*  64 @ */ 0x2a, 0x3a, 0x64, 0x77,  0x61, 0x6f, 0x31, 0x31, /*  65 A */ 0x2c, 0x38, 0x4e, 0x4f,  0x6a, 0x71, 0x06, 0x06,
    /*  66 B */ 0x5b, 0x4a, 0x6c, 0x6e,  0x66, 0x6a, 0x0c, 0x04, /*  67 C */ 0x3d, 0x43, 0x5e, 0x00,  0x5e, 0x30, 0x03, 0x14,
    /*  68 D */ 0x5e, 0x44, 0x54, 0x5e,  0x6b, 0x66, 0x0c, 0x01, /*  69 E */ 0x57, 0x45, 0x6d, 0x41,  0x63, 0x2b, 0x0b, 0x0e,
    /*  70 F */ 0x52, 0x49, 0x69, 0x41,  0x55, 0x00, 0x06, 0x00, /*  71 G */ 0x41, 0x40, 0x5e, 0x33,  0x5f, 0x69, 0x04, 0x11,
    /*  72 H */ 0x3e, 0x3d, 0x76, 0x7f,  0x55, 0x54, 0x06, 0x06, /*  73 I */ 0x3f, 0x56, 0x1b, 0x3a,  0x35, 0x54, 0x0a, 0x0c,
    /*  74 J */ 0x1c, 0x56, 0x00, 0x54,  0x34, 0x58, 0x12, 0x03, /*  75 K */ 0x3e, 0x48, 0x88, 0x3f,  0x55, 0x62, 0x06, 0x06,
    /*  76 L */ 0x3e, 0x00, 0x55, 0x00,  0x62, 0x2f, 0x0a, 0x10, /*  77 M */ 0x60, 0x60, 0x7f, 0x8c,  0x4e, 0x50, 0x05, 0x05,
    /*  78 N */ 0x63, 0x3c, 0x73, 0x76,  0x51, 0x90, 0x05, 0x07, /*  79 O */ 0x45, 0x51, 0x53, 0x53,  0x5b, 0x62, 0x07, 0x0c,
    /*  80 P */ 0x55, 0x53, 0x67, 0x65,  0x54, 0x00, 0x06, 0x00, /*  81 Q */ 0x45, 0x51, 0x54, 0x54,  0x5c, 0x66, 0x07, 0x35,
    /*  82 R */ 0x5c, 0x48, 0x6d, 0x67,  0x54, 0x57, 0x06, 0x05, /*  83 S */ 0x3f, 0x3c, 0x4d, 0x42,  0x2e, 0x63, 0x0f, 0x09,
    /*  84 T */ 0x51, 0x6e, 0x16, 0x3f,  0x16, 0x3f, 0x01, 0x04, /*  85 U */ 0x3e, 0x3d, 0x55, 0x54,  0x5b, 0x62, 0x08, 0x0e,
    /*  86 V */ 0x3e, 0x3e, 0x4f, 0x4f,  0x3f, 0x50, 0x02, 0x05, /*  87 W */ 0x3a, 0x33, 0x73, 0x8a,  0x74, 0x74, 0x06, 0x06,
    /*  88 X */ 0x47, 0x3f, 0x35, 0x5b,  0x57, 0x55, 0x06, 0x06, /*  89 Y */ 0x40, 0x40, 0x39, 0x52,  0x15, 0x40, 0x02, 0x04,
    /*  90 Z */ 0x35, 0x75, 0x0a, 0x4e,  0x62, 0x36, 0x0b, 0x11, /*  91 [ */ 0x23, 0x39, 0x29, 0x24,  0x29, 0x24, 0x19, 0x30,
    /*  92 \ */ 0x3a, 0x00, 0x3a, 0x16,  0x01, 0x4e, 0x00, 0x25, /*  93 ] */ 0x18, 0x45, 0x00, 0x4c,  0x00, 0x4c, 0x18, 0x30,
    /*  94 ^ */ 0x30, 0x41, 0x1a, 0x1a,  0x00, 0x00, 0x00, 0x00, /*  95 _ */ 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x1f, 0x22,
    /*  96 ` */ 0x20, 0x16, 0x00, 0x00,  0x00, 0x00, 0x03, 0x00, /*  97 a */ 0x04, 0x04, 0x3a, 0x85,  0x5f, 0x77, 0x09, 0x0c,
    /*  98 b */ 0x42, 0x05, 0x6c, 0x66,  0x6a, 0x61, 0x07, 0x0e, /*  99 c */ 0x00, 0x08, 0x4b, 0x3d,  0x4e, 0x30, 0x02, 0x14,
    /* 100 d */ 0x03, 0x44, 0x58, 0x79,  0x58, 0x73, 0x08, 0x0d, /* 101 e */ 0x01, 0x06, 0x5e, 0x75,  0x60, 0x4e, 0x04, 0x15,
    /* 102 f */ 0x08, 0x58, 0x39, 0x5f,  0x18, 0x35, 0x02, 0x04, /* 103 g */ 0x03, 0x03, 0x58, 0x78,  0x58, 0x74, 0x2c, 0x50,
    /* 104 h */ 0x42, 0x04, 0x65, 0x63,  0x4c, 0x4d, 0x05, 0x05, /* 105 i */ 0x01, 0x22, 0x22, 0x4a,  0x20, 0x68, 0x0a, 0x0f,
    /* 106 j */ 0x00, 0x23, 0x1d, 0x52,  0x00, 0x4c, 0x2a, 0x36, /* 107 k */ 0x44, 0x00, 0x5b, 0x56,  0x55, 0x5b, 0x05, 0x06,
    /* 108 l */ 0x41, 0x22, 0x26, 0x27,  0x17, 0x4d, 0x00, 0x08, /* 109 m */ 0x04, 0x03, 0x6b, 0x99,  0x48, 0x88, 0x05, 0x09,
    /* 110 n */ 0x00, 0x04, 0x64, 0x64,  0x4c, 0x4d, 0x05, 0x05, /* 111 o */ 0x01, 0x05, 0x55, 0x64,  0x56, 0x61, 0x06, 0x0e,
    /* 112 p */ 0x00, 0x05, 0x6b, 0x66,  0x69, 0x62, 0x44, 0x0f, /* 113 q */ 0x02, 0x03, 0x55, 0x7d,  0x56, 0x75, 0x07, 0x4d,
    /* 114 r */ 0x00, 0x06, 0x4a, 0x57,  0x4a, 0x03, 0x05, 0x00, /* 115 s */ 0x00, 0x07, 0x55, 0x40,  0x26, 0x6f, 0x0c, 0x0a,
    /* 116 t */ 0x1b, 0x13, 0x4e, 0x4d,  0x20, 0x48, 0x00, 0x09, /* 117 u */ 0x00, 0x00, 0x4d, 0x4c,  0x54, 0x70, 0x05, 0x0d,
    /* 118 v */ 0x00, 0x00, 0x4e, 0x4e,  0x3a, 0x59, 0x01, 0x06, /* 119 w */ 0x00, 0x00, 0x4f, 0x5e,  0x6d, 0x7a, 0x05, 0x05,
    /* 120 x */ 0x00, 0x00, 0x4c, 0x5a,  0x45, 0x5d, 0x06, 0x06, /* 121 y */ 0x00, 0x00, 0x4f, 0x4f,  0x2e, 0x5f, 0x35, 0x25,
    /* 122 z */ 0x00, 0x00, 0x22, 0x78,  0x4c, 0x3e, 0x09, 0x0e, /* 123 { */ 0x00, 0x52, 0x25, 0x3b,  0x15, 0x44, 0x00, 0x48,
    /* 124 | */ 0x01, 0x3d, 0x01, 0x47,  0x01, 0x47, 0x01, 0x47, /* 125 } */ 0x28, 0x29, 0x02, 0x5d,  0x03, 0x55, 0x28, 0x20,
    /* 126 ~ */ 0x00, 0x00, 0x35, 0x3c,  0x04, 0x15, 0x00, 0x00
  ];

  /**
   * A brighter version of the character data in `CHAR_DATA`
   * @type {number[]}
   */
  static BRIGHTER_CHAR_DATA = EditorMinimap.CHAR_DATA.map (code => {
    return Math.min (255, Math.max (0, Math.round (code * 1.3)));
  });

  /**
   * Returns the index into the character data for the given character code.
   * @param {number} charCode The character to render
   */
  static getCharIndex (charCode) {
    return Math.max (0, Math.min (EditorMinimap.MAX_CHAR, charCode - EditorMinimap.MIN_CHAR));
  }

  /**
   * Returns the buffer the minimap renders to
   * @returns {ImageData} The rendering image buffer (or `null` if unable to create)
   */
  getBuffer () {
    if (this.buffer === null) {
      if (this.width === 0 || this.height === 0) {
        return null;
      }

      this.canvas.width  = this.width;
      this.canvas.height = this.height;
      this.buffer        = this.context.createImageData (Math.ceil (this.width), Math.ceil (this.height));
    }

    return this.buffer;
  }

  /**
   * Clear the render buffer to the background color.
   *
   * The background color is looked up in the {@link EditorThemeColors} of the {@link EditorStore}.
   */
  clearBuffer () {
    const buffer = this.getBuffer ();
    const color  = this.store.theme.background;

    if (buffer) {
      var offset = 0;
      for (var i = 0; i < this.height; i++) {
        for (var j = 0; j < this.width; j++) {
          buffer.data[offset + 0] = color.r;
          buffer.data[offset + 1] = color.g;
          buffer.data[offset + 2] = color.b;
          buffer.data[offset + 3] = 0xff;
          offset += 4;
        }
      }
    }
  }

  /**
   * Update the layout information for the minimap elements.
   */
  updateLayout () {
    const store       = this.store;
    const metrics     = store.viewMetrics;
    const max_lines   = Math.floor (this.canvas.clientHeight / EditorMinimap.CHAR_HEIGHT);
    const line_height = metrics.lineHeight;
    const start_line  = metrics.scrollTopLine;
    const end_line    = metrics.scrollBottomLine;
    const line_count  = end_line - start_line + 1;

    this.width  = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;

    this.sliderHeight = Math.floor (line_count * EditorMinimap.CHAR_HEIGHT);
    this.sliderMaxTop = Math.max (0, store.lines.length * EditorMinimap.CHAR_HEIGHT - this.sliderHeight);
    this.sliderMaxTop = Math.min (this.height - this.sliderHeight, this.sliderMaxTop);
    this.SliderChanged.fire ();

    this.sliderRatio = this.sliderMaxTop / (line_height * store.lines.length - metrics.viewHeight);
    this.sliderTop   = metrics.scrollTop * this.sliderRatio;

    if (max_lines >= store.lines.length) {
      this.lineStart = 0;
      this.lineEnd   = store.lines.length - 1;
    } else {
      this.lineStart = Math.max (0, Math.floor (start_line - this.sliderTop / EditorMinimap.CHAR_HEIGHT));
      this.lineEnd   = Math.min (store.lines.length - 1, this.lineStart + max_lines - 1);
    }
  }

  /**
   * Renders a character into the minimap buffer.
   *
   * @param {number[]} charData The character data table
   * @param {ImageData} buffer The buffer to render to
   * @param {number} x The x-coordinate into the buffer
   * @param {number} y The y-coordinate into the buffer
   * @param {number} charCode The character code to render
   * @param {EditorColor} background The background color
   * @param {EditorColor} color The foreground color
   */
  static renderChar (charData, buffer, x, y, charCode, background, color) {
    const dest        = buffer.data;
    var   dest_offset = 4 * (y * buffer.width + x);
    const char_offset = EditorMinimap.getCharIndex (charCode) << 3;
    const remaining   = buffer.width - x;

    var br, bg, bb, cr, cg, cb;
    br = background.r;
    bg = background.g;
    bb = background.b;
    cr = color.r - br;
    cg = color.g - bg;
    cb = color.b - bb;

    if (remaining === 0) {
      return;
    } else if (remaining === 1) {
      var c = charData[char_offset + 0] / 255;
      dest[dest_offset + 0] = br + c * cr;
      dest[dest_offset + 1] = bg + c * cg;
      dest[dest_offset + 2] = bb + c * cb;
      dest[dest_offset + 3] = 0xff;
      dest_offset += 4 * buffer.width;

      c = charData[char_offset + 2] / 255;
      dest[dest_offset + 0] = br + c * cr;
      dest[dest_offset + 1] = bg + c * cg;
      dest[dest_offset + 2] = bb + c * cb;
      dest[dest_offset + 3] = 0xff;
      dest_offset += 4 * buffer.width;

      c = charData[char_offset + 4] / 255;
      dest[dest_offset + 0] = br + c * cr;
      dest[dest_offset + 1] = bg + c * cg;
      dest[dest_offset + 2] = bb + c * cb;
      dest[dest_offset + 3] = 0xff;
      dest_offset += 4 * buffer.width;

      c = charData[char_offset + 6] / 255;
      dest[dest_offset + 0] = br + c * cr;
      dest[dest_offset + 1] = bg + c * cg;
      dest[dest_offset + 2] = bb + c * cb;
      dest[dest_offset + 3] = 0xff;
    } else {
      var c = charData[char_offset + 0] / 255;
      dest[dest_offset + 0] = br + c * cr;
      dest[dest_offset + 1] = bg + c * cg;
      dest[dest_offset + 2] = bb + c * cb;
      dest[dest_offset + 3] = 0xff;

      c = charData[char_offset + 1] / 255;
      dest[dest_offset + 4] = br + c * cr;
      dest[dest_offset + 5] = bg + c * cg;
      dest[dest_offset + 6] = bb + c * cb;
      dest[dest_offset + 7] = 0xff;
      dest_offset += 4 * buffer.width;


      c = charData[char_offset + 2] / 255;
      dest[dest_offset + 0] = br + c * cr;
      dest[dest_offset + 1] = bg + c * cg;
      dest[dest_offset + 2] = bb + c * cb;
      dest[dest_offset + 3] = 0xff;

      c = charData[char_offset + 3] / 255;
      dest[dest_offset + 4] = br + c * cr;
      dest[dest_offset + 5] = bg + c * cg;
      dest[dest_offset + 6] = bb + c * cb;
      dest[dest_offset + 7] = 0xff;
      dest_offset += 4 * buffer.width;


      c = charData[char_offset + 4] / 255;
      dest[dest_offset + 0] = br + c * cr;
      dest[dest_offset + 1] = bg + c * cg;
      dest[dest_offset + 2] = bb + c * cb;
      dest[dest_offset + 3] = 0xff;

      c = charData[char_offset + 5] / 255;
      dest[dest_offset + 4] = br + c * cr;
      dest[dest_offset + 5] = bg + c * cg;
      dest[dest_offset + 6] = bb + c * cb;
      dest[dest_offset + 7] = 0xff;
      dest_offset += 4 * buffer.width;


      c = charData[char_offset + 6] / 255;
      dest[dest_offset + 0] = br + c * cr;
      dest[dest_offset + 1] = bg + c * cg;
      dest[dest_offset + 2] = bb + c * cb;
      dest[dest_offset + 3] = 0xff;

      c = charData[char_offset + 7] / 255;
      dest[dest_offset + 4] = br + c * cr;
      dest[dest_offset + 5] = bg + c * cg;
      dest[dest_offset + 6] = bb + c * cb;
      dest[dest_offset + 7] = 0xff;
      dest_offset += 4 * buffer.width;
    }
  }

  /**
   * Render the minimap.
   *
   * This function renders the minimap from the `lineStart` to the `lineEnd` properties that we
   * computed in the {@link EditorMinimap#updateLayout} method. The method uses the `renderChar`
   * function to render the line characters with the colors from the {@link EditorTheme} to the
   * `ImageData`, after which it is rendered into the canvas with `putImageData`.
   */
  render () {
    const store      = this.store;
    const theme      = store.theme;
    const charData   = EditorMinimap.BRIGHTER_CHAR_DATA;
    const buffer     = this.getBuffer ();
    const width      = this.width;

    if (!buffer) {
      return;
    }

    this.clearBuffer ();

    for (var y = 0, i = this.lineStart; i <= this.lineEnd; i++, y += 4) {
      var x = 0, line = store.lines.get (i);

      line.elements.forEach (function (element) {
        if (x < width && element.style !== null && element.style !== "whitespace") {
          const color = theme[element.style];
          for (var j = 0; j < element.text.length && x < width; j++, x += 2) {
            EditorMinimap.renderChar (charData, buffer, x, y, element.text.charCodeAt (j), theme.background, color);
          }
        } else {
          x += 2 * element.length;
        }
      });
    }

    this.context.putImageData (this.buffer, 0, 0);
  }

  /**
   * Listens to the {@link EditorLineCollection#LinesChanged} event and updates the layout
   * information and then renders the minimap.
   */
  onLinesChanged () {
    this.updateLayout ();
    this.render ();
  }

  /**
   * A method that is bound to the {@link EditorLineCollection#LineContentChanged} event.
   *
   * This method will re-render the mimimap when the index of the line is within the bounds
   * of the minimap (i.e. between `lineStart` and `lineEnd`).
   *
   * @param {EditorLine} line The line that was changed
   */
  onLineContentChanged (line) {
    if (line.index >= this.lineStart && line.index <= this.lineEnd) {
      this.render ();
    }
  }

  /**
   * A method that is bound to the {@link EditorViewMetrics#Scroll} event.
   *
   * This method will update the layout of the minimap and render it.
   */
  onScroll () {
    this.updateLayout ();
    this.render ();
  }
}
