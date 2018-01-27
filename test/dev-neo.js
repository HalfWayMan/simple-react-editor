import React from "react";
import ReactDOM from "react-dom";

import { EditorStore, Editor } from "../src/Editor.js";
import { EditorSyntaxEngine } from "../src/EditorSyntax.js";
import styles from "../src/Editor.scss";

var   store  = null;
const config = {
  mountFocused: true,
  syntax:       EditorSyntaxEngine.JavaScript
};

function createEditor (content) {
  window.store = store = new EditorStore (config, content);
  ReactDOM.render (<Editor store={store} />, document.getElementById ("container"));
}

function loadOwnSource () {
  const xhr = new XMLHttpRequest ();
  xhr.open ("GET", "../src/Editor.js");
  xhr.onload = function () {
    if (xhr.readyState == 4) {
      createEditor (xhr.responseText);
    }
  };

  xhr.send (null);
}

if (window.location.hash !== "#empty") {
  loadOwnSource ();
} else {
  createEditor ("");
}
