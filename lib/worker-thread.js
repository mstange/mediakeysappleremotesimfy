let { Cc, Ci, Cu } = require("chrome");
let data = require("self").data;
let workerThreadModule = Cu.import(data.url("WorkerThread.jsm"));

exports.createWorker = function createWorker(url) {
  return workerThreadModule.createWorker(url);
}

exports.createChromeWorker = function createChromeWorker(url) {
  return workerThreadModule.createChromeWorker(url);
}
