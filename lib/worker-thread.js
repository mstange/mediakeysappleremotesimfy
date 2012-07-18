let { Cu } = require("chrome");
let workerThreadModuleURL = require("self").data.url("WorkerThread.jsm");
let workerThreadModule = Cu.import(workerThreadModuleURL);
require("unload").when(function () { Cu.unload(workerThreadModuleURL); });

exports.createWorker = function createWorker(url) {
  return workerThreadModule.createWorker(url);
}

exports.createChromeWorker = function createChromeWorker(url) {
  return workerThreadModule.createChromeWorker(url);
}
