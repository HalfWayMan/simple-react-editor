/**
 * Represents a parsed syntax region with a given style and content.
 */
export class SyntaxRegion {
  /**
   * @param {number} start The start of the new syntax region (column index)
   */
  constructor (start) {
    /**
     * The name of the style applied to this region (default `null`)
     * @type {string?}
     */
    this.style = null;

    /**
     * The start column of this region.
     * @type {number}
     */
    this.start = start;

    /**
     * The end column of this region
     * @type {number}
     */
    this.end = start;

    /**
     * The length of this region (in original characters)
     * @type {number}
     */
    this.length = 0;

    /**
     * The text that is contained in this region
     * @type {string}
     */
    this.text = "";

    /**
     * The HTML escaped version of the text contained in this region.
     * @type {string}
     */
    this.html = "";
  }

  /**
   * Escape a code-point into HTML.
   * @param {number} code The code point to escape
   * @returns {string} An HTML entity
   */
  static escapeCodePoint (code) {
    switch (code) {
      case 0x20: return "&nbsp;";
      case 0x26: return "&amp;";
      case 0x3c: return "&lt;";
      case 0x3e: return "&gt;";
      default:
      return String.fromCodePoint (code);
    }
  }

  /**
   * Escape a string to HTML.
   * @param {string} str The string to escape
   * @returns {string} The HTML escaped string
   */
  static escapeString (str) {
    const ESCAPED = { ' ': "&nbsp;", '&': "&amp;", '<': "&lt;", '>': "&gt;" };
    return str.replace (/[\s&<>]/g, c => ESCAPED[c]);
  }

  /**
   * Append a code point to this syntax region.
   *
   * This will append the given code point to this syntax region, using
   * {@link SyntaxRegion#escapeCode} to get the HTML escaped entity.
   *
   * This method will append the original code point as a character string
   * to the `text` property. The escaped code point will be appended to the
   * `html` property. The `length` and `end` properties will be incremented.
   *
   * @param {number} code The code point to append to this region.
   */
  appendCodePoint (code) {
    this.html += SyntaxRegion.escapeCodePoint (code);
    this.text += String.fromCodePoint (code);
    this.length++;
    this.end++;
  }

  /**
   * Append a string to this syntax region.
   *
   * This will append the given string to this syntax region, using
   * {@link SyntaxRegion#escapeString} to get the HTML escaped string.
   *
   * This method will append the original string to the `text` property. It
   * will then append the HTML-escaped string to the `html` property. The
   * `length` and `end` properties will be incremented by the length of the
   * string.
   *
   * @param {string} str The string to append to this syntax region.
   */
  appendString (str) {
    this.html   += SyntaxRegion.escapeString (str);
    this.text   += str;
    this.length += str.length;
    this.end    += str.length;
  }
}

/**
 * Represents a collection of {@link SyntaxRegion}.
 *
 * Whilst this is mostly a wrapper around an array, a few functions are provided to append characters and
 * strings with a given style to the current `SyntaxRegion`, and automatically create a new `SyntaxRegion`
 * when the style changes.
 *
 * @example
 * var regions = new EditorSyntaxEngine.SyntaxRegionCollection ();
 * regions.appendString ("reserved_word", "return");
 * regions.appendString ("whitespace", " ");
 * regions.appendString ("number", "0x");
 * regions.appendString ("number", "123abc");
 * regions.finish ();
 *
 * // At this point the 'regions' property will contain the following regions:
 * //   { start: 0, end: 6, length: 6, style: "reserved_word", text: "return", escaped: "return" }
 * //   { start: 6, end: 7, length: 1, style: "whitespace", text: " ", escaped: "&nbsp;" }
 * //   { start: 7, end: 15, length: 8, style; "number", text: "0x123abc", escaped: "0x123abc" }
 */
export class SyntaxRegionCollection {
  /**
   * Create a new `SyntaxRegionCollection`
   */
  constructor () {
    /**
     * The regions that have been collected up in this collection (default `[]`).
     * @type {SyntaxRegion[]}
     */
    this.regions = [];

    /**
     * The current region that this collection is populating.
     * @type {SyntaxRegion}
     */
    this.current = new SyntaxRegion (0);

    /**
     * The total length of the regions within this syntax region collection (default `0`).
     * @type {number}
     */
    this.length  = 0;
  }


  /**
   * Save the current `SyntaxRegion` in the `current` property and create a new one.
   *
   * This method will push the current `SyntaxRegion` into the `regions` property and
   * increment the `length` property by the `length` of the current `SyntaxRegion`.
   *
   * Then it will create a new `SyntaxRegion` and assign it to the `current` property.
   * This new `SyntaxRegion` will have a start offset being the current `length` of
   * this `SyntaxRegionCollection`.
   */
  saveCurrent () {
    this.regions.push (this.current);
    this.length += this.current.length;
    this.current = new SyntaxRegion (this.length);
  }

  /**
   * Finish off this syntax region collection by pusing the current `SyntaxRegion` if
   * it is not empty.
   */
  finish () {
    if (this.current.length > 0) {
      this.saveCurrent ();
    }
  }

  /**
   * Given a style, either set the `style` property of the current `SyntaxRegion`
   * or save the current region (via {@link SyntaxRegionCollection#saveCurrent})
   * and set the `style` of the new `SyntaxRegion`.
   *
   * Essentially this method ensures that the given style matches the current `SyntaxRegion`
   * or it will start a new region. If the current region has not yet had a style assigned
   * to it (the `style` property is `null`) then the style is assigned to it.
   *
   * @param {string} style    The style to apply to the current (or new) syntax region
   */
  saveOrSetStyle (style) {
    if (this.current.style === null) {
      this.current.style = style;
    } else if (this.current.style !== style) {
      this.saveCurrent ();
      this.current.style = style;
    }
  }

  /**
   * Append a code point to the current `SyntaxRegion` with the given style.
   *
   * @param {string} style    The style of the code point
   * @param {number} code     The code point
   * @see {@link SyntaxRegion#appendCodePoint}
   * @see {@link SyntaxRegionCollection#saveOrSetStyle}
   */
  appendCodePoint (style, code) {
    this.saveOrSetStyle (style);
    this.current.appendCodePoint (code);
  }

  /**
   * Append a string to the current `SyntaxRegion` with the given style.
   *
   * @param {string} style    The style of the string
   * @param {string} str      The string to append
   * @see {@link SyntaxRegion#appendString}
   * @see {@link SyntaxRegionCollection#saveOrSetStyle}
   */
  appendString (style, str) {
    this.saveOrSetStyle (style);
    this.current.appendString (str);
  }
}

/**
 * Provides the syntax highlighting state machine.
 *
 * More information about the defintion of rules for the syntax highlighting engine
 * can be found in the documentation for {@link SyntaxConfig} and the related structures.
 */
export class EditorSyntaxEngine {
  /**
   * Construct a new `EditorSyntaxEngine` with the given configuration.
   * @param {SyntaxConfig} config The syntax configuration to load into this engine.
   */
  constructor (config) {
    /**
     * The configuration for the syntax engine
     * @type {SyntaxConfig}
     * @property {object} ruleMap A mapping property is added to the {@link SyntaxConfig} which maps a rule name to a rule declaration
     */
    this.config = config;

    /**
     * The current state of the engine
     * @type {number}
     */
    this.state = 0;

    Object.keys (this.config).forEach (state_name => {
      if (this.config[state_name].rules) {
        this.config[state_name].ruleMap = this.config[state_name].rules.reduce ((acc, rule) => {
          return acc[rule.name] = rule, acc;
        }, {});
      } else {
        /* The state in this configuration does not have any rules. */
        this.config[state_name].rules   = [];
        this.config[state_name].ruleMap = {};
      }

      if (this.config[state_name].import) {
        /* Duplicate the configuration for this state so we don't modify the original syntax schema */
        this.config[state_name] = Object.assign ({}, this.config[state_name]);

        /* Duplicate the array of rules for this state as well. */
        var rules   = this.config[state_name].rules = this.config[state_name].rules.slice (0);
        var ruleMap = this.config[state_name].ruleMap;

        this.config[state_name].import.forEach (impdec => {
          if (!this.config.hasOwnProperty (impdec.state)) {
            throw new Error ("Unknown state '" + impdec.state + "' in import declaration found in state '" + state_name + "'");
          }

          if (!this.config[impdec.state].ruleMap.hasOwnProperty (impdec.name)) {
            throw new Error ("Unknown rule '" + impdec.rule + "' in state '" + impdec.state + "' in import declaration found in stance '" + state_name + "'");
          }

          var found = this.config[impdec.state].ruleMap[impdec.name];
          ruleMap[impdec.name] = found;
          rules.push (found);
        });
      }
    });
  }

  /**
   * Return the style name for the current state of the syntax engine.
   *
   * The various states in a syntax highlighting state machine can have an associated style. This
   * associated style is essentially the default style used when rendering elements that pass through
   * the syntax highlighter whilst it is in that state.
   *
   * @returns {string} The style for the current state of the engine (or null)
   */
  getStateStyle () {
    return this.config[this.state].style;
  }

  /**
   * This function will try and match the given string to the current ruleset.
   *
   * Essentially this means taking the rules from the current state of the syntax engine and testing
   * them one-by-one until either one of them matches the given string or we reach the end of the ruleset.
   *
   * If there is a match then this method will return an object describing the match. If no rule could
   * be matched against the given string then the function will return `null`.
   *
   * When a rule is successfully matched which has a `goto` property, the state of the engine is changed
   * to that target state.
   *
   * On successful match of a rule the returned object from this method will have the following properties:
   *
   * + A `rule` property which references the rule that was successfully matched,
   * + A `length` property giving the number of characters that were matched,
   * + A `style` property that gives the style of the matched characters.
   *
   * The `style` property contains either:
   *
   * 1. The `style` property of the successfully matched rule,
   * 2. The `style` property of the current state (after possible state change), or
   * 3. The string `"plain"`.
   *
   * @param {string} content The text to test against the current ruleset
   * @param {number} [start] The start index into `content`
   * @returns {object}
   */
  match (content, start) {
    var str   = start ? content.substring (start) : content;
    var state = this.config[this.state];

    for (var i = 0; i < state.rules.length; i++) {
      const rule = state.rules[i];
      const res  = rule.expr.exec (str);

      if (res) {
        /* If we have a 'goto' instruction, then set our new state */
        if (typeof rule.goto === "number") {
          this.state = rule.goto;
        }

        /* The style to apply is either the direct rule 'style' property or the 'style' property of our (possibly new) state */
        return { style: rule.style || this.config[this.state].style || state.style, rule: rule, length: res[0].length };
      }
    }

    return null;
  }

  /**
   * Match the end of a line.
   *
   * Certain states match against the end of the line (those with a `$eol` property). This method
   * will check whether there is a `$eol` property in the current state, and if so it will change
   * to the target state.
   */
  matchEOL () {
    var state = this.config[this.state];
    if (state.hasOwnProperty ("$eol")) {
      this.state = state["$eol"];
    }
  }

  /**
   * Perform syntax highlighting for a single line.
   *
   * Essentially this method repeatedly applies {@link EditorSyntaxEngine#match} until all the
   * characters in the line have been consumed. However, special consideration is made for whitespace
   * characters: tab characters are expanded to `tab_size` space characters and space characters
   * are escaped. All whitespace is given the `whitespace` style by default.
   *
   * @example
   * var engine = new EditorSyntaxEngine (EditorSyntaxEngine.JavaScript);
   * var result = engine.hightlightLine ("return true", 0);
   *
   * @param {string} line          The line that we are to syntax highlight
   * @param {number} [start_state] The initial state for the line (default to current state)
   * @param {number} [tab_size]    The size to which tabs should be expanded (default: 2)
   * @returns {SyntaxRegionCollection}
   */
  highlightLine (line, start_state, tab_size) {
    /* Initialize at the start state (or original state) */
    this.state = start_state || this.state;

    /* Make sure that the tab size is sane; fall back to the default config */
    tab_size = tab_size || EditorStore.defaultConfig.tabSize;

    const length     = line.length;
    var   regions    = new SyntaxRegionCollection ();
    var   last_index = 0;

    while (last_index < length) {
      const char = line[last_index];
      const code = char.codePointAt (0);

      if (code === 0x09) { /* tab */
        for (var t = 0; t < tab_size; t++) {
          regions.appendCodePoint ("whitespace", 0x20);
        }

        last_index++;
      } else if (/\s/.test (char)) {
        regions.appendCodePoint ("whitespace", code);
        last_index++;
      } else {
        const fallback_style = this.getStateStyle () || "plain";

        var result = this.match (line, last_index);
        if (result) {
          regions.appendString (result.style || fallback_style, line.substring (last_index, last_index + result.length));
          last_index += result.length;
        } else {
          regions.appendCodePoint (fallback_style, code);
          last_index++;
        }
      }
    }

    regions.finish ();
    this.matchEOL ();

    return regions;
  }

  /**
   * Perform syntax highlighting over the given set of lines.
   *
   * This method will run the syntax highlighting engine of the given set of lines and
   * return an array of arrays of {@link SyntaxRegion}. Each element
   * of the array corresponds to a line, and each sub-element describes a syntax region.
   *
   * @example
   * var engine = new EditorSyntaxEngine (EditorSyntaxEngine.JavaScript);
   * var lines  = [ "function foo () {", "  return true;", "}" ];
   * var result = engine.highlightLines (lines, 0);
   *
   * @param {string[]} lines         Array of lines to syntax highlight
   * @param {number}   [start_state] The start state for the engine (default: to current state)
   * @param {number}   [tab_size]    The size to which tabs should be expanded (default: 2)
   * @returns {SyntaxRegion[][]}
   */
  highlightLines (lines, start_state, tab_size) {
    /* Initialise at the start state (or original satte) */
    this.state = start_state || this.state;

    /* Make sure that the tab size is sane; fallback to the default config */
    tab_size = tab_size || EditorStore.defaultConfig.tabSize;

    var regions = [];
    for (var i = 0; i < lines.length; i++) {
      regions.push (this.highlightLine (lines[i], null, tab_size).regions);
    }

    return regions;
  }

  /**
   * A syntax defintion for the JavaScript language.
   *
   * @example
   * var engine = new EditorSyntaxEngine (EditorSyntaxEngine.JavaScript);
   *
   * @type {SyntaxConfig}
   */
  static JavaScript = {
    /* no state */
    0: {
      style: null,
      rules: [
        {
          name:  "line_comment_start",
          expr:  /^\/\//,
          goto:  1
        },

        {
          name:  "block_comment_start",
          expr:  /^\/\*/,
          goto:  2
        },

        {
          name:  "string_literal_start",
          expr:  /^["]/,
          goto:  3
        },

        {
          name:  "char_literal_start",
          expr:  /^[']/,
          goto:  4
        },

        {
          name:  "reserved_word",
          expr:  /^(var|function|new|this|typeof|true|false|null|prototype|return|try|catch|if|else|for(all)?|continue|break|throw|switch|case|default|while|do|instanceof|const|import|export|extends|constructor|from|class|static)\b/,
          style: "reserved"
        },

        {
          name:  "type_name",
          expr:  /^[A-Z][a-zA-Z0-9_]*/,
          style: "typename"
        },

        {
          name:  "identifier",
          expr:  /^[_a-z][a-zA-Z0-9_]*/,
          style: "identifier"
        },

        {
          name:  "hexadecimal",
          expr:  /^0[xX][0-9a-fA-F]*/,
          style: "number"
        },

        {
          name:  "decimal",
          expr:  /^[0-9]+(\.[0-9]*)?/,
          style: "number"
        },

        {
          name:  "regexp",
          expr:  /^\/.*\/[gimuy]*/,
          style: "regexp"
        }
      ]
    },

    /* line comment */
    1: {
      style: "comment",
      $eol:  0
    },

    /* block comment */
    2: {
      style: "comment",
      rules: [
        {
          name:  "block_comment_end",
          expr:  /^\*\//,
          style: "comment",
          goto:  0
        }
      ]
    },

    /* string literal */
    3: {
      style: "string",
      rules: [
        {
          name:  "string_literal_escape",
          expr:  /^\\([\\'"bfnrtv0]|(?:[1-7][0-7]{0,2}|[0-7]{2,3})|(?:x[a-fA-F0-9]{2})|(?:u[a-fA-F0-9]{4}))/,
          style: "string_escape"
        },

        {
          name: "string_literal_end",
          expr: /^["]/,
          goto: 0
        }
      ]
    },

    /* character literal */
    4: {
      style: "string",
      rules: [
        {
          name: "char_literal_end",
          expr: /^[']/,
          goto: 0
        }
      ],

      import: [
        { state: 3, name: "string_literal_escape" },
      ]
    }
  }
}

/**
 * A syntax configuration consists of a dictionary of states, where each state contains
 * a number of rules to execute against the text we are highlighting.
 *
 * All syntax configurations must contain at least one state with the name `0`, as that
 * is the start state for the {@link EditorSyntaxEngine}.
 *
 * **Example 1**
 *
 * As a first quick example we will look at a configuration for a syntax highlighter
 * that highlights a simple calculator language. We will highlight the four basic operators
 * of the language with the style `"operator"`, and highlight simple decimal numbers
 * with the style `"number"`:
 *
 * ```JavaScript
 * {
 *   0: {
 *     rules: [
 *       {
 *         name:  "operators",
 *         expr:  /^[-+*\/]/,
 *         style: "operator"
 *       },
 *       {
 *         name:  "decimal",
 *         expr:  /^[0-9]+/,
 *         style: "number"
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * **Example 2**
 *
 * In this example we are going to take our simple calculator from above and add in
 * block comments. We will follow the Haskell block-comment syntax.
 *
 * ```JavaScript
 * {
 *   0: {
 *     rules: [
 *       {
 *         name:  "operators",
 *         expr:  /^[-+*\/]/,
 *         style: "operator"
 *       },
 *       {
 *         name:  "decimal",
 *         expr:  /^[0-9]+/,
 *         style: "number"
 *       },
 *       {
 *         name:  "comment_start",
 *         expr:  /^{-/,
 *         goto:  1
 *       }
 *     ]
 *   },
 *   1: {
 *     style: "comment",
 *     rules: [
 *       {
 *         name:  "comment_end",
 *         expr:  /^-}/,
 *         style: "comment"
 *         goto:  0
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * The first addition to our previous example is the new rule in state 0 called `"comment_start"`.
 * This rule matches the character sequence `{-` and, if found, will change the state of
 * the syntax engine to state 1.
 *
 * We also added a new state, state 1. First of all this state has a default style: `comment`.
 * This means that anything which doesn't match a rule in this state (or which matches a rule
 * that has no `style` property) will have the style `comment` applied to it.
 *
 * In our new state we have a single rule called `"comment_end"`, which has an expression that
 * matches the character sequence `-}`. If this sequence is matched then we've found the end
 * of the block comment and the state of the syntax engine is transitioned to state 0.
 *
 * One important take-away from this example is the use of the `style` property on the `"comment_end"`
 * rule in state 1. As this rule has transitioned the state of the syntax engine to 0, the
 * style applied to the matched end sequence `-}` will be the default style of state 0 (`plain`).
 * However we still want to style the end sequence with the `comment` style, so we make sure that
 * this rule has a `style` property. Contrarywise, the `"comment_start"` rule in state 0 has no
 * `style` property. This is because we want to assume the default style for the new state, which
 * the rule has transitioned to state 1: default style is `comment`.
 *
 * @typedef {Object} SyntaxConfig
 * @property {SyntaxConfigState} 0 The initial state of the syntax (all must have a 0 state)
 * @property {SyntaxConfigState} * Subsequent states of the syntax configuration
 */

/**
 * Each state in a syntax configuration consists primarily of a combination of the
 * properties defined here.
 *
 * If the state has a `style` property then this is the default style when the engine
 * is in this state. That is, if the `state` property of the {@link EditorSyntaxEngine}
 * instance is equal to this state, then the default style that is applied is that which
 * is given in the `style` property of this state.
 *
 * The `rules` property is an array of rules that are applied, one-by-one, until one
 * of them matches the fragment of text that we are trying to highlight. See {@link SyntaxConfigRule}
 * for more information about how rules operate.
 *
 * The `import` property provides a means of importing rules from other states into
 * this state. This can save on needless duplication of what may sometimes be fairly
 * complex regular expressions.
 *
 * Finally, there is a special property called `$eol` that, if set, describes a target
 * state to which the engine should change when the end of a line is reached. Primarily
 * this is used when we are in a state that we want to terminate at the end of a line.
 * For example, when parsing line comments in C-style languages (such as JavaScript) we
 * want to return to the root state (state `0`) when we reach the end of the line.
 *
 * @typedef {Object} SyntaxConfigState
 * @property {string} [style] The style to apply whilst in this syntax state
 * @property {SyntaxConfigRule[]} [rules] The rules to execute whilst in this state
 * @property {SyntaxConfigImport[]} [import] Rules to import from other states
 * @property {number} [$eol] When an end-of-line is encountered, goto this state
 */

/**
 * Describes an import of a rule from one {@link SyntaxConfigState} into another.
 *
 * There are two properties of an import: the `state` from which we want to import
 * a rule and the `name` of the rule to import. All properties of the rule will be
 * copied as if they were originally placed into the `rules` property of the
 * `SyntaxConfigState`.
 *
 * @typedef {Object} SyntaxConfigImport
 * @property {number} state The state to import a rule from
 * @property {string} name The name of the rule to import
 */

/**
 * Describes a rule that matches some syntax element.
 *
 * Each {@link SyntaxConfigState} in a syntax configuration may contain an array of
 * rules. Each of these rules are tested against the fragment of text that we are trying
 * to highlight.
 *
 * Every rule must have at least two properties: a `name` property that provides the
 * name of the rule (used in debugging and when referencing this rule for import), and
 * an `expr` property which gives the regular expression to test against the text
 * fragment we are tring to highlight.
 *
 * There are two additional properties: `goto` which gives the name of a state that
 * should be changed to if this rule is satisfied, and `style` which gives an optional
 * style to apply when this rule is satisfied.
 *
 * **Which Style is Selected**
 *
 * There are essentially three options for the style that is applied to a fragment
 * of text that matches a rule:
 *
 * 1. The `style` property of the rule that has been matched,
 * 2. The current `style` property of the {@link SyntaxConfigState}, or
 * 3. The `"plain"` style.
 *
 * Note that point 2 (the `style` of the current state) includes the state transition.
 * This means that if we use a `goto` property to change to a new state, the style that
 * is applied to the matched text will be the `style` of the new {@link SyntaxConfigState}
 * (not the old one).
 *
 * If a rule could not be satisified, the list is somewhat shorter (being the last two
 * items):
 *
 * 1. The current `style` property of the {@link SyntaxConfigState}, or
 * 2. The `"plain"` style.
 *
 * @typedef {Object} SyntaxConfigRule
 * @property {string} name The name of the rule
 * @property {RegExp} expr The regular expression for this rule
 * @property {number} [goto] When expression has been satisfied, goto this new state
 * @property {string} [style] When expression has been satisifed, apply this style
 */
