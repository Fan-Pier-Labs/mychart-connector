const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const emptyShim = path.resolve(__dirname, "shims/fs-empty.js");

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  zlib: require.resolve("browserify-zlib"),
  buffer: require.resolve("buffer"),
  stream: require.resolve("readable-stream"),
  crypto: require.resolve("crypto-browserify"),
  path: require.resolve("path-browserify"),
  url: require.resolve("url"),
  util: require.resolve("util"),
  events: require.resolve("events"),
  assert: require.resolve("assert"),
  http: require.resolve("stream-http"),
  https: require.resolve("https-browserify"),
  os: require.resolve("os-browserify/browser"),
  string_decoder: require.resolve("string_decoder"),
  querystring: require.resolve("querystring-es3"),
  process: require.resolve("process/browser"),
  fs: emptyShim,
  net: emptyShim,
  tls: emptyShim,
  child_process: emptyShim,
  dgram: emptyShim,
  dns: emptyShim,
};

config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, ".."),
];

module.exports = config;
