/**
 * Usage:
 * 
 * var osxMediaKeysModule = require("osx-media-keys");
 * var osxMediaKeys = osxMediaKeysModule.createInstance();
 * osxMediaKeys.addEventListener("keydown", function (event) {
 *   dump("keydown: " + event.keyCode + "\n");
 *   if (event.keyCode == event.kMediaKeyPlay)
 *     dump("Start / Stop\n");
 * });
 *
 * osxMediaKeys.startListening();
 * osxMediaKeys.stopListening();
 * osxMediaKeys.shutdown();
 */

let workerThread = require("worker-thread");
let data = require("self").data;
let runtime = require("runtime");
let url = require("url");

function OSXMediaKeysButtonEvent(type, keyCode) {
  this.type = type;
  this.keyCode = keyCode;
}

OSXMediaKeysButtonEvent.prototype = {
  // see ev_keymap.h
  // There are different constants for "Next" and "Fast" resp.
  // "Previous" and "Rewind", but on all Apple keyboards I've
  // seen they're the same key, and their keycode is the
  // Fast/Rewind one.
  kMediaKeyPlay:     16, //   >
  kMediaKeyNext:     17, //  >>|
  kMediaKeyPrevious: 18, //  |<<
  kMediaKeyFast:     19, //  >>
  kMediaKeyRewind:   20  //   <<
};

function OSXMediaKeys() {
  let self = this;
  let libPath = url.toFilename(data.url("libOSXMediaKeysThreadedCWrapper.dylib"));
  this._worker = workerThread.createChromeWorker(data.url("OSXMediaKeysControllerWorker.js"));
  this._worker.postMessage({ fun: "init", arg: libPath })
  this._worker.addEventListener("message", function workerSentMessage(msg) {
    self._notifyListeners(msg.data);
  });
  this._listeners = {};
}

OSXMediaKeys.prototype = {
  startListening: function OSXMediaKeys_startListening() {
    this._worker.postMessage({ fun: "startListening" });
  },

  stopListening: function OSXMediaKeys_stopListening() {
    this._worker.postMessage({ fun: "stopListening" });
  },

  shutdown: function OSXMediaKeys_shutdown() {
    this._worker.postMessage({ fun: "shutdown" });
  },

  addEventListener: function OSXMediaKeys_addEventListener(type, fun) {
    if (!(type in this._listeners)) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(fun);
  },

  removeEventListener: function OSXMediaKeys_removeEventListener(type, fun) {
    if (!(type in this._listeners))
      return;
    let index = this._listeners[type].indexOf(fun);
    if (index != -1)
      this._listeners[type].splice(index, 1);
  },

  _notifyListeners: function OSXMediaKeys__notifyListeners(e) {
    if (!(e.type in this._listeners))
      return;

    let event = new OSXMediaKeysButtonEvent(e.type, e.keyCode);
    this._listeners[e.type].forEach(function (listener) {
      listener(event);
    });
  },
}

exports.createInstance = function createInstance() {
  if (runtime.OS != "Darwin")
    return null;

  return new OSXMediaKeys();
}
