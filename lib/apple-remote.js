/**
 * Usage:
 * 
 * var appleRemoteModule = require("apple-remote");
 * var appleRemote = appleRemoteModule.createInstance();
 * appleRemote.addEventListener("buttondown", function (event) {
 *   dump("buttondown: " + event.button + "\n");
 *   if (event.button == event.kRemoteButtonPlay)
 *     dump("Start / Stop\n");
 * });
 * appleRemote.addEventListener("buttonpress", function (event) {
 *   dump("buttonpress: " + event.button + "\n");
 *   if (event.button == event.kRemoteButtonPlus)
 *     osxSystemVolume.increaseVolume();
 *   else if (event.button == event.kRemoteButtonMinus)
 *     osxSystemVolume.decreaseVolume();
 * });
 * appleRemote.addEventListener("buttonup", function (event) {
 *   dump("buttonup: " + event.button + "\n");
 * });
 *
 * appleRemote.startListening();
 * appleRemote.stopListening();
 * appleRemote.shutdown();
 */

let workerThread = require("worker-thread");
let data = require("self").data;
let runtime = require("runtime");
let url = require("url");

function AppleRemoteButtonEvent(type, button) {
  this.type = type;
  this.button = button;
}

AppleRemoteButtonEvent.prototype = {
  // normal events
  kRemoteButtonPlus:       1<<1,
  kRemoteButtonMinus:      1<<2,
  kRemoteButtonMenu:       1<<3,
  kRemoteButtonPlay:       1<<4,
  kRemoteButtonRight:      1<<5,
  kRemoteButtonLeft:       1<<6,

  // hold events
  kRemoteButtonPlus_Hold:  1<<7,
  kRemoteButtonMinus_Hold: 1<<8,
  kRemoteButtonMenu_Hold:  1<<9,
  kRemoteButtonPlay_Hold:  1<<10,
  kRemoteButtonRight_Hold: 1<<11,
  kRemoteButtonLeft_Hold:  1<<12,

  // special events (not supported by all devices)
  kRemoteControl_Switched: 1<<13
};

function AppleRemote() {
  let self = this;
  let libPath = url.toFilename(data.url("libAppleRemoteThreadedCWrapper.dylib"));
  this._worker = workerThread.createChromeWorker(data.url("AppleRemoteControllerWorker.js"));
  this._worker.postMessage({ fun: "init", arg: libPath })
  this._worker.addEventListener("message", function workerSentMessage(msg) {
    self._notifyListeners(msg.data);
  });
  this._listeners = {};
}

AppleRemote.prototype = {
  startListening: function AppleRemote_startListening() {
    this._worker.postMessage({ fun: "startListening" });
  },

  stopListening: function AppleRemote_stopListening() {
    this._worker.postMessage({ fun: "stopListening" });
  },

  shutdown: function AppleRemote_shutdown() {
    this._worker.postMessage({ fun: "shutdown" });
  },

  addEventListener: function AppleRemote_addEventListener(type, fun) {
    if (!(type in this._listeners)) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(fun);
  },

  removeEventListener: function AppleRemote_removeEventListener(type, fun) {
    if (!(type in this._listeners))
      return;
    let index = this._listeners[type].indexOf(fun);
    if (index != -1)
      this._listeners[type].splice(index, 1);
  },

  _notifyListeners: function AppleRemote__notifyListeners(e) {
    if (!(e.type in this._listeners))
      return;

    let event = new AppleRemoteButtonEvent(e.type, e.button);
    this._listeners[e.type].forEach(function (listener) {
      listener(event);
    });
  },
}

exports.createInstance = function createInstance() {
  if (runtime.OS != "Darwin")
    return null;

  return new AppleRemote();
}
