let runtime = require("runtime");
let cmdRunnerModule = require("command-runner");

function runAppleScript(script) {
  if (runtime.OS != "Darwin")
    return;

  cmdRunnerModule.runCommand("osascript" + script.split("\n").map(function (line) {
    return " -e '" + line.replace(/'/g, '\\\'') + "'";
  }).join(""));
}

function changeVolumeBy(delta) {
  runAppleScript(
    'set oldVolume to output volume of (get volume settings)\n' +
    'set volume output volume (oldVolume + ' + delta + ')\n' +
    'set newVolume to output volume of (get volume settings)\n' +
    'if (newVolume is not equal to oldVolume) then\n' +
    '  do shell script "afplay /System/Library/LoginPlugins/BezelServices.loginPlugin/Contents/Resources/volume.aiff > /dev/null 2>&1 &"\n' +
    'end if'
  );
}

exports.increaseVolume = function increaseVolume() {
  changeVolumeBy(100 / 16);
}

exports.decreaseVolume = function decreaseVolume() {
  changeVolumeBy(-100 / 16);
}
