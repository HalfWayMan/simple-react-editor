import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

/* --------------------------------------------------------------------------------------------------------------------------- */

import { EditorTools, EditorIdGenerator } from './EditorTools.js';
import { EditorPosition } from './EditorPosition.js';
import { EditorLine } from './EditorLine.js';
import { EditorCursor } from './EditorCursor.js';
import { EditorStore } from './EditorStore.js';
import { EditorMinimap } from './EditorMinimap.js';

/* --------------------------------------------------------------------------------------------------------------------------- */

export { EditorStore } from './EditorStore.js';

/* --------------------------------------------------------------------------------------------------------------------------- */
/* -- REACT COMPONENTS                                                                                                         */
/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderLineNumbers extends React.Component {
  onScroll () {
    this.forceUpdate ();
  }

  onLinesChanged () {
    this.forceUpdate ();
  }

  onMetricsChanged () {
    this.forceUpdate ();
  }

  componentDidMount () {
    this.props.store.lines.LinesChanged.bindTo (this, this.onLinesChanged);
    this.props.store.viewMetrics.Scroll.bindTo (this, this.onScroll);
    this.props.store.viewMetrics.CharWidthChanged.bindTo (this, this.onMetricsChanged);
  }

  componentWillUnmount () {
    this.props.store.LinesChanged.unbindFrom (this);
    this.props.store.viewMetrics.Scroll.unbindFrom (this);
    this.props.store.viewMetrics.CharWidthChanged.unbindFrom (this);
  }

  static charWidth (store) {
    return Math.max (store.config.minLineNumberChars, 2 + Math.floor (Math.log10 (1 + store.lines.length)));
  }

  render () {
    const store = this.props.store;
    if (store.config.lineNumbers) {
      const width       = RenderLineNumbers.charWidth (store);
      const metrics     = store.viewMetrics;
      const first_line  = metrics.scrollTopLine;
      const last_line   = metrics.scrollBottomLine;
      const line_height = metrics.lineHeight;
      const lines       = store.lines.filter (line => line.index >= first_line && line.index <= last_line).map (line => {
        return <span key={line.id} style={{ top: line.index * metrics.lineHeight }}>{1 + line.index}</span>;
      });

      return (
        <div ref="lines" className="line-numbers" style={{ width: metrics.charWidth * width, height: store.lines.length * metrics.lineHeight }}>
          {lines}
        </div>
      );
    } else return null;
  }
}

RenderLineNumbers.propTypes = {
  store: PropTypes.instanceOf (EditorStore).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderGutterMarker extends React.Component {
  onMarkerChanged () {
    this.forceUpdate ();
  }

  componentDidMount () {
    this.props.line.MarkerChanged.bindTo (this, this.onMarkerChanged);
  }

  componentWillUnmount () {
    this.props.line.MarkerChanged.unbindFrom (this);
  }

  render () {
    const line = this.props.line;

    if (line.marker) {
      const metrics = line.collection.store.viewMetrics;

      return (
        <div className="gutter-element"
             style={{
               left:   0,
               top:    line.index * metrics.lineHeight,
               width:  metrics.charWidth,
               height: metrics.lineHeight
             }}>
          {React.createElement (line.marker.element, Object.assign ({ line: line }, line.marker.props))}
        </div>
      );
    } else return null;
  }
}

RenderGutterMarker.propTypes = {
  line: PropTypes.instanceOf (EditorLine).isRequired
};

class RenderGutter extends React.Component {
  onLinesChanged () {
    this.forceUpdate ();
  }

  onDimensionsChanged () {
    this.forceUpdate ();
  }

  componentDidMount () {
    this.props.store.lines.LinesChanged.bindTo (this, this.onLinesChanged);
    this.props.store.viewMetrics.LineHeightChanged.bindTo (this, this.onDimensionsChanged);
    this.props.store.viewMetrics.CharWidthChanged.bindTo (this, this.onDimensionsChanged);
  }

  componentWillUnmount () {
    this.props.store.lines.LinesChanged.unbindFrom (this);
    this.props.store.viewMetrics.LineHeightChanged.unbindFrom (this);
    this.props.store.viewMetrics.CharWidthChanged.unbindFrom (this);
  }

  static charLeft (store) {
    if (store.config.lineNumbers) {
      return RenderLineNumbers.charWidth (store);
    } else return 0;
  }

  render () {
    const store = this.props.store;
    if (store.config.lineGutter) {
      const left     = RenderGutter.charLeft (store);
      const elements = store.lines.filter (line => line.marker !== null).map ((line, index) => {
        return <RenderGutterMarker key={index} line={line} />;
      });

      return (
        <div className="gutter"
             style={{
               left:   left * store.viewMetrics.charWidth,
               width:  2 * store.viewMetrics.charWidth,
               height: store.lines.length * store.viewMetrics.lineHeight,
             }}>
          {elements}
        </div>
      );
    } else return null;
  }
}

RenderGutter.propTypes = {
  store: PropTypes.instanceOf (EditorStore).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderIndentRegions extends React.Component {
  onRegionsChanged () {
    this.forceUpdate ();
  }

  onDimensionsChanged () {
    this.forceUpdate ();
  }

  componentDidMount () {
    this.props.store.lines.indentRegions.Changed.bindTo (this, this.onRegionsChanged);
    this.props.store.viewMetrics.CharWidthChanged.bindTo (this, this.onDimensionsChanged);
    this.props.store.viewMetrics.LineHeightChanged.bindTo (this, this.onDimensionsChanged);
  }

  componentWillUnmount () {
    this.props.store.lines.indentRegions.Changed.unbindFrom (this);
    this.props.store.viewMetrics.CharWidthChanged.unbindFrom (this);
    this.props.store.viewMetrics.LineHeightChanged.unbindFrom (this);
  }

  render () {
    const store     = this.props.store;
    const metrics   = store.viewMetrics;
    const tab_size  = store.config.tabSize;
    const regions   = store.lines.indentRegions;
    const last_line = metrics.scrollBottomLine;

    const columns = regions.map ((region, column) => {
      const left   = column * tab_size * metrics.charWidth;
      const blocks = region.filter (block => block.start <= last_line).map ((block, index) => {
        return <div key={index}
                    style={{
                      left:   left,
                      top:    block.start * metrics.lineHeight,
                      height: (1 + (block.end - block.start)) * metrics.lineHeight
                    }} />;
      });

      return <div key={column}>{blocks}</div>;
    });

    return <div className="indent-indicator-regions">{columns}</div>;
  }
}

RenderIndentRegions.propTypes = {
  store: PropTypes.instanceOf (EditorStore).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderCursor extends React.Component {
  onCursorChanged (cursor) {
    this.forceUpdate ();
  }

  onDimensionsChanged () {
    this.forceUpdate ();
  }

  onBlink (index) {
    this.refs.cursor.style.visibility = index ? "visible" : "hidden";
  }

  componentDidMount () {
    const store = this.props.store;

    this.props.cursor.PositionChanged.bindTo (this, this.onCursorChanged);
    store.viewMetrics.LineHeightChanged.bindTo (this, this.onDimensionsChanged);
    store.viewMetrics.CharWidthChanged.bindTo (this, this.onDimensionsChanged);
    store.cursors.Blink.bindTo (this, this.onBlink);
  }

  componentWillUnmount () {
    const store = this.props.store;

    this.props.cursor.PositionChanged.unbindFrom (this);
    store.viewMetrics.LineHeightChanged.unbindFrom (this);
    store.viewMetrics.CharWidthChanged.unbindFrom (this);
    store.cursors.Blink.unbindFrom (this);
  }

  render () {
    const cursor  = this.props.cursor;
    const client  = this.props.store.viewMetrics.indicesToClient (cursor.position);
    const classes = {
      "cursor":    true,
      "secondary": !cursor.primary
    };

    /* Make sure that the initial visibility of a cursor corresponds to all others */
    client.visibility = this.props.store.cursors.blinkIndex ? "visible" : "hidden";
    client.height     = this.props.store.viewMetrics.lineHeight;
    return <div ref="cursor" className={EditorTools.classes (classes)} style={client} />;
  }
}

RenderCursor.propTypes = {
  store:  PropTypes.instanceOf (EditorStore).isRequired,
  cursor: PropTypes.instanceOf (EditorCursor).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderCursorSelection extends React.Component {
  computeLineBlocks () {
    const cursor      = this.props.cursor;
    const store       = cursor.collection.store;
    const line_height = store.viewMetrics.lineHeight;
    const char_width  = store.viewMetrics.charWidth;
    const selection   = cursor.selection.region;

    this.selection_blocks = [];
    for (var i = selection.startLine; i <= selection.endLine; i++) {
      const line  = store.lines.get (i);
      const left  = i === selection.startLine ? selection.startColumn : 0;
      const right = i === selection.endLine ? selection.endColumn : line.length;

      this.selection_blocks.push ({
        top:    i * line_height,
        left:   left * char_width,
        width:  (right - left) * char_width,
        height: line_height + 1
      });
    }
  }

  onSelectionChanged () {
    if (this.props.cursor.selection) {
      this.computeLineBlocks ();
      this.forceUpdate ();
    }
  }

  componentWillMount () {
    this.computeLineBlocks ();
  }

  componentDidMount () {
    this.props.cursor.SelectionChanged.bindTo (this, this.onSelectionChanged);
  }

  componentWillUnmount () {
    this.props.cursor.SelectionChanged.unbindFrom (this);
  }

  render () {
    const blocks = this.selection_blocks.map ((block, index) => {
      return <div key={index} className="selection-block" style={block} />;
    });

    return (
      <div>
        {blocks}
      </div>
    );
  }
}

RenderCursorSelection.propTypes = {
  cursor: PropTypes.instanceOf (EditorCursor).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderCursorContainer extends React.Component {
  onCursorUpdated () {
    this.forceUpdate ();
  }

  componentDidMount () {
    this.props.store.cursors.CursorAdded.bindTo (this, this.onCursorUpdated);
    this.props.store.cursors.CursorRemoved.bindTo (this, this.onCursorUpdated);

    this.props.store.cursors.primary.PositionChanged.bindTo (this, this.onCursorUpdated);
    this.props.store.cursors.primary.SelectionChanged.bindTo (this, this.onCursorUpdated);
  }

  componentWillUnmount () {
    this.props.store.cursors.CursorAdded.unbindFrom (this);
    this.props.store.cursors.CursorRemoved.unbindFrom (this);

    this.props.store.cursors.primary.PositionChanged.unbindFrom (this);
    this.props.store.cursors.primary.SelectionChanged.unbindFrom (this);
  }

  render () {
    const store = this.props.store;

    const selections = store.cursors.map ((cursor, index) => {
      if (cursor.selection) {
        return <RenderCursorSelection key={index} cursor={cursor} />;
      } else return null;
    });

    const cursors = store.cursors.map ((cursor, index) => {
      return <RenderCursor key={index} store={store} cursor={cursor} />;
    });

    const encapsulator_style = { width: store.viewMetrics.charWidth, height: store.viewMetrics.lineHeight };
    const encapsulators      = store.cursors.map ((cursor, index) => {
      const offset = cursor.getEncapsulatorOffset ();
      if (offset !== null) {
        const style = Object.assign ({}, encapsulator_style, { marginLeft: offset * store.viewMetrics.charWidth }, store.viewMetrics.indicesToClient (cursor.position));
        return <div key={index} className="encapsulator-marker" style={style} />;
      } else return null;
    });

    const alt_encapsulators = store.cursors.map ((cursor, index) => {
      const matching = cursor.getMatchingEncapsulator ();
      if (matching !== null) {
        const style = Object.assign ({}, encapsulator_style, store.viewMetrics.indicesToClient (matching));
        return <div key={"alt_" + index} className="encapsulator-marker matching" style={style} />;
      } else return null;
    });

    return (
      <div className="cursors">
        {selections}
        {cursors}
        {encapsulators}
        {alt_encapsulators}
      </div>
    );
  }
}

RenderCursorContainer.propTypes = {
  store: PropTypes.instanceOf (EditorStore).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderLine extends React.Component {
  onContentChanged () {
    this.forceUpdate ();
  }

  onActiveLineChanged (prev_active, next_active) {
    if (prev_active === next_active) return;

    var element = this.refs.line;
    if (prev_active === this.props.line.index) {
      element.className = element.className.replace (/\scurrent-line/g, '');
    } else if (next_active === this.props.line.index) {
      element.className += " current-line";
    }
  }

  componentDidMount () {
    this.props.line.ContentChanged.bindTo (this, this.onContentChanged);
    this.props.store.ActiveLineChanged.bindTo (this, this.onActiveLineChanged);
  }

  componentWillUnmount () {
    this.props.line.ContentChanged.unbindFrom (this);
    this.props.store.ActiveLineChanged.unbindFrom (this);
  }

  render () {
    const line      = this.props.line;
    const metrics   = this.props.store.viewMetrics;
    const primary   = this.props.store.cursors.primary;
    const className = {
      "line":         true,
      "current-line": line.index === primary.line
    };

    return (
      <div ref="line"
           className={EditorTools.classes (className)}
           style={{
             top:    line.index * metrics.lineHeight,
             height: metrics.lineHeight
           }}
           dangerouslySetInnerHTML={{ __html: line.render }} />
    );
  }
}

RenderLine.propTypes = {
  store: PropTypes.instanceOf (EditorStore).isRequired,
  line:  PropTypes.instanceOf (EditorLine).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderLines extends React.Component {
  getClickLocation (event) {
    const lines = this.refs.lines;
    const crect = lines.getBoundingClientRect ();
    const top   = (event.clientY - crect.top) + lines.scrollTop;
    const left  = (event.clientX - crect.left) + lines.scrollLeft;

    return this.props.store.viewMetrics.clientToIndices (left, top);
  }

  onViewClick (event) {
    const store    = this.props.store;
    const cursors  = store.cursors;
    const location = this.getClickLocation (event);

    cursors.removeSecondary ();

    if (this.tripleTimeout) {
      window.clearTimeout (this.tripleTimeout);
      this.tripleTimeout = null;

      const line = store.lines.get (location.line);
      if (line) {
        cursors.primary.selectLine (line);
      }
    } else {
      cursors.primary.removeSelection ();
      cursors.primary.setPosition (location, event.shiftKey);
    }
  }

  onViewDoubleClick (event) {
    if (this.tripleTimeout) {
      window.clearTimeout (this.tripleTimeout);
      this.tripleTimeout = null;
    }

    this.tripleTimeout = window.setTimeout (() => {
      this.tripleTimeout = null;

      const cursors = this.props.store.cursors;
      cursors.removeSecondary ();
      cursors.primary.selectWord ();
    }, 150);
  }

  onViewTripleClicked (event) {
    const location = this.getClickLocation (event);
    const line     = this.store.lines.get (location.line);

    if (line) {
      store.cursors.removeSecondary ();
      store.cursors.primary.selectLine (line);
    }
  }

  onDimensionsChanged () {
    this.forceUpdate ();
  }

  onLinesChanged () {
    this.forceUpdate ();
  }

  onScroll (prev_scroll, next_scroll) {
    this.forceUpdate ();
  }

  componentDidMount () {
    this.props.store.theme.extractFromDOM (this.refs.lines);
    this.props.store.viewMetrics.CharWidthChanged.bindTo (this, this.onDimensionsChanged);
    this.props.store.viewMetrics.Scroll.bindTo (this, this.onScroll);
    this.props.store.lines.LinesChanged.bindTo (this, this.onLinesChanged);
  }

  componentWillUnmount () {
    this.props.store.viewMetrics.CharWidthChanged.unbindFrom (this);
    this.props.store.viewMetrics.Scroll.unbindFrom (this);
    this.props.store.lines.LinesChanged.unbindFrom (this);
  }

  getLeftOffset () {
    const store         = this.props.store;
    const numbers_width = RenderGutter.charLeft (store);

    if (store.config.lineGutter) {
      return store.viewMetrics.charWidth * (2 + numbers_width);
    } else return store.viewMetrics.charWidth * numbers_width;
  }

  render () {
    const store       = this.props.store;
    const right       = store.config.minimap ? 100 : 0;
    const left_offset = this.getLeftOffset ();
    const first_line  = store.viewMetrics.scrollTopLine;
    const last_line   = store.viewMetrics.scrollBottomLine;
    const lines       = store.lines.filter (line => {
      return line.index >= first_line && line.index <= last_line;
    }).map (line => {
      return <RenderLine key={line.id} store={store} line={line} />;
    });

    return (
      <div ref="lines" className="lines"
           style={{
             left:   left_offset,
             height: store.viewMetrics.lineHeight * store.lines.length,
             right:  right
           }}
           onClick={(event) => this.onViewClick (event)}
           onDoubleClick={(event) => this.onViewDoubleClick (event)}>
        {lines}
        <RenderIndentRegions store={store} />
        <RenderCursorContainer store={store} />
      </div>
    );
  }
}

RenderLine.propTypes = {
  store: PropTypes.instanceOf (EditorStore).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderMinimapSlider extends React.Component {
  constructor (props) {
    super (props);
    this.state = { dragging: false, start: 0, startTop: 0 };
  }

  onSliderMouseDown (event) {
    if (event.button !== 0) {
      return;
    }

    this.setState ({ dragging: true, start: event.clientY, startTop: this.props.minimap.sliderTop }, function () {
      this.removeMouseMove = EditorTools.listen (document, "mousemove", (event) => this.onMouseMove (event));
      this.removeMouseUp   = EditorTools.listen (document, "mouseup", (event) => this.onMouseUp (event));
    }.bind (this));
  }

  onMouseMove (event) {
    const minimap = this.props.minimap;
    const delta   = event.clientY - this.state.start;
    const desired = Math.min (minimap.sliderMaxTop, Math.max (0, this.state.startTop + delta));

    if (minimap.sliderRatio > 0) {
      minimap.store.viewMetrics.scrollTo (Math.round (desired / minimap.sliderRatio), true);
    }
  }

  onMouseUp () {
    this.removeMouseMove ();
    this.removeMouseMove = null;

    this.removeMouseUp ();
    this.removeMouseUp = null;

    this.setState ({ dragging: false, start: 0, startTop: 0 });
    return false;
  }

  onSliderChanged () {
    this.forceUpdate ();
  }

  componentDidMount () {
    this.props.minimap.SliderChanged.bindTo (this, this.onSliderChanged);
  }

  componentWillUnmount () {
    this.props.minimap.SliderChanged.unbindFrom (this);
  }

  render () {
    const minimap = this.props.minimap;
    return (
      <div className={"slider" + (this.state.dragging ? " active" : "")}
           style={{ top: minimap.sliderTop, height: minimap.sliderHeight }}
           onMouseDown={(event) => this.onSliderMouseDown (event)} />
    );
  }
}

RenderMinimapSlider.propTypes = {
  minimap: PropTypes.instanceOf (EditorMinimap).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

class RenderMinimap extends React.Component {
  onScroll (prev_scroll, next_scroll) {
    const store = this.props.store;
    const limit = store.viewMetrics.lineHeight * store.lines.length - store.viewMetrics.viewHeight;
    this.refs.minimap.style.top = Math.max (0, Math.min (next_scroll, limit)) + "px";
  }

  /*
  onCanvasClick (event) {
    const minimap = this.minimap;
    const crect   = this.refs.minimap.getBoundingClientRect ();
    const offset  = event.clientY - crect.top;
    const desired = Math.min (minimap.sliderMaxTop, Math.max (0, offset - minimap.sliderHeight / 2));

    this.props.store.viewMetrics.scrollTo (Math.round (desired / minimap.sliderRatio));
  }
  */

  onCanvasClick (event) {
    const minimap = this.minimap;
    const crect   = this.refs.minimap.getBoundingClientRect ();
    const offset  = event.clientY - crect.top;
    const line    = Math.min (this.props.store.lines.length, minimap.lineStart + offset / EditorMinimap.CHAR_HEIGHT);

    this.props.store.viewMetrics.scrollToLine (line, true);
  }

  refreshMinimap () {
    this.forceUpdate (() => {
      this.minimap.updateLayout ();
      this.minimap.render ();
    });
  }

  componentDidMount () {
    this.minimap = new EditorMinimap (this.props.store, this.refs.canvas);

    this.props.store.viewMetrics.Scroll.bindTo (this, this.onScroll);
    this.props.store.viewMetrics.LineHeightChanged.bindTo (this, this.refreshMinimap);
    this.props.store.theme.Changed.bindTo (this, this.refreshMinimap);
  }

  componentWillUnmount () {
    this.props.store.viewMetrics.Scroll.unbindFrom (this);
    this.props.store.viewMetrics.LineHeightChanged.unbindFrom (this);
    this.props.store.theme.Changed.unbindFrom (this);
  }

  render () {
    const metrics = this.props.store.viewMetrics;
    const style   = {
      top:    metrics.scrollTop,
      height: metrics.viewHeight
    };

    return (
      <div ref="minimap" className="minimap" style={style}>
        <canvas ref="canvas" onClick={(event) => this.onCanvasClick (event)} />
        {this.minimap ? <RenderMinimapSlider minimap={this.minimap} /> : null}
      </div>
    );
  }
}

RenderMinimap.propTypes = {
  store: PropTypes.instanceOf (EditorStore).isRequired
};

/* --------------------------------------------------------------------------------------------------------------------------- */

/**
 * Editor component.
 *
 * Pass in the {@link EditorStore} in the `store` property.
 */
export class Editor extends React.Component {
  onContainerKeyDown (event) {
    if (this.props.store.keymap.onKeyDown (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  }

  onContainerKeyUp (event) {
    if (this.props.store.keymap.onKeyUp (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  }

  onContainerKeyPress (event) {
    if (this.props.store.keymap.onKeyPress (event)) {
      event.preventDefault ();
      event.stopPropagation ();
    }
  }

  onContainerFocus () {
    this.props.store.cursors.startBlink (true);
  }

  onContainerBlur () {
    this.props.store.cursors.stopBlink (false);
  }

  onContainerScroll () {
    this.props.store.viewMetrics.scrollTo (this.refs.container.scrollTop);
  }

  updateMetricsFromCharGuide () {
    const guide = this.refs.charGuide;
    const crect = guide.getBoundingClientRect ();
    this.props.store.viewMetrics.setLineHeight (crect.height);
    this.props.store.viewMetrics.setCharWidth (crect.width / 2);
  }

  updateMetricsFromViewHeight () {
    const container = this.refs.container;
    this.props.store.viewMetrics.setViewHeight (container.clientHeight);
  }

  onViewStateScroll (prevScroll, nextScroll) {
    const container = this.refs.container;
    if (container.scrollTop != nextScroll) {
      container.scrollTop = nextScroll;
    }
  }

  componentDidMount () {
    this.updateMetricsFromCharGuide ();
    this.updateMetricsFromViewHeight ();
    this.props.store.viewMetrics.Scroll.bindTo (this, this.onViewStateScroll);
  }

  componentWillUnmount () {
    this.props.store.viewMetrics.Scroll.unbindFrom (this);
  }

  render () {
    const store = this.props.store;

    return (
      <div ref="container" className="editor" tabIndex={1}
           onKeyDown={(event) => this.onContainerKeyDown (event)}
           onKeyUp={(event) => this.onContainerKeyUp (event)}
           onFocus={(event) => this.onContainerFocus ()}
           onBlur={(event) => this.onContainerBlur ()}
           onScroll={(event) => this.onContainerScroll ()}>
        <div ref="charGuide" className="char-guide">MM</div>
        <RenderLineNumbers store={store} />
        <RenderGutter store={store} />
        <RenderLines store={store} />
        <RenderMinimap store={store} />
      </div>
    );
  }
}

Editor.propTypes = {
  store: PropTypes.instanceOf (EditorStore).isRequired
};
