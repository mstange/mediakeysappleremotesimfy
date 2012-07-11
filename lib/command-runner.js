let workerThread = require("worker-thread");
let data = require("self").data;
let runtime = require("runtime");

let sWorker = null;
function getWorker() {
  if (!sWorker) {
    sWorker = workerThread.createChromeWorker(data.url("CmdRunWorker.js"));
    sWorker.postMessage(runtime.OS);
  }
  return sWorker;
}

exports.runCommand = function runCommand(cmd, callback) {
  let worker = getWorker();
  worker.addEventListener("message", function workerSentMessage(msg) {
    if (msg.data.cmd == cmd) {
      worker.removeEventListener("message", workerSentMessage);
      if (callback)
        callback(msg.data.result);
    }
  });
  worker.postMessage(cmd);
}
