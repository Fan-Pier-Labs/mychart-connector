// Minimal zlib shim for React Native. The shared CLO image parser only
// uses `inflateSync`; back it with pako (~60KB, pure JS) instead of
// pulling in browserify-zlib's readable-stream tree.
const pako = require("pako");
const { Buffer } = require("buffer");

function inflateSync(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Buffer.from(pako.inflate(bytes));
}

function deflateSync(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Buffer.from(pako.deflate(bytes));
}

module.exports = { inflateSync, deflateSync };
