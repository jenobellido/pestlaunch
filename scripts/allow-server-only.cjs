// Lets command-line scripts import server code. "server-only" throws unless Next's bundler
// resolves it; scripts run outside Next, so point it at an empty module.
const Module = require("node:module");
const path = require("node:path");
const empty = path.join(__dirname, "empty-module.cjs");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return request === "server-only" ? empty : resolve.call(this, request, ...rest);
};
