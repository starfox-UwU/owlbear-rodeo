// `process` 垫片必须排在所有依赖之前：react-markdown / path-browserify /
// TensorFlow.js 里的 `process.*` 调用没有做 `typeof` 保护。
import "./polyfills/process";
import "./polyfills/xhrResponseText";
import ReactDOM from "react-dom";
import App from "./App";
import Modal from "react-modal";

// Add css for simplebar
import "simplebar/dist/simplebar.min.css";

import * as serviceWorker from "./serviceWorker";

import "./index.css";

// Pointer events shim
if (!("PointerEvent" in window)) {
  import("pepjs");
}

// Intersection observer polyfill
if (!("IntersectionObserver" in window)) {
  import("intersection-observer");
}

Modal.setAppElement("#root");

ReactDOM.render(<App />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
