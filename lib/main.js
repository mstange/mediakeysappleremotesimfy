let data = require("self").data;
let pageMod = require("page-mod");
const {Cc,Ci,Cu} = require("chrome");

let appleRemoteModule = require("./apple-remote");;
let osxMediaKeysModule = require("./osx-media-keys");
let osxSystemVolume = require("./osx-system-volume");

let appleRemote = appleRemoteModule.createInstance();
let osxMediaKeys = osxMediaKeysModule.createInstance();

exports.onUnload = function (reason) {
  appleRemote.shutdown();
  osxMediaKeys.shutdown();
}

// Listening to the Apple Remote means that the up / down buttons are
// disabled, too, so they don't control the system volume anymore.
// But we still want them to do that, so we reimplement it here.
appleRemote.addEventListener("buttonpress", function (e) {
  if (e.button == e.kRemoteButtonPlus)
    osxSystemVolume.increaseVolume();
  else if (e.button == e.kRemoteButtonMinus)
    osxSystemVolume.decreaseVolume();
});

let numOpenSimfyPages = 0;

pageMod.PageMod({
  include: "*.simfy.de",
  contentScriptFile: data.url("simfy-page-mod.js"),
  onAttach: function (worker) {
    numOpenSimfyPages++;
    appleRemote.startListening();
    osxMediaKeys.startListening();
    function buttondownListener(event) {
      if (event.button == event.kRemoteButtonPlay)
        worker.port.emit("togglePlayback");
      else if (event.button == event.kRemoteButtonRight)
        worker.port.emit("playNext");
      else if (event.button == event.kRemoteButtonLeft)
        worker.port.emit("playPrevious");
    }
    function keydownListener(event) {
      if (event.keyCode == event.kMediaKeyPlay)
        worker.port.emit("togglePlayback");
      else if (event.keyCode == event.kMediaKeyFast)
        worker.port.emit("playNext");
      else if (event.keyCode == event.kMediaKeyRewind)
        worker.port.emit("playPrevious");
    }
    appleRemote.addEventListener("buttondown", buttondownListener);
    osxMediaKeys.addEventListener("keydown", keydownListener);
    worker.on("detach", function () {
      appleRemote.removeEventListener("buttondown", buttondownListener);
      osxMediaKeys.removeEventListener("keydown", keydownListener);
      numOpenSimfyPages--;
      if (numOpenSimfyPages <= 0) {
        appleRemote.stopListening();
        osxMediaKeys.stopListening();
      }
    });
  }
});
