const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const shimDir = path.resolve(__dirname, "src/lib/shims");
const scrapersDir = path.resolve(__dirname, "../scrapers");

// Allow importing from the scrapers and shared directories outside expo-app
config.watchFolders = [scrapersDir, path.resolve(__dirname, "../shared")];

// Node built-in modules → React Native shims (used by main repo scrapers)
const nodeShims = {
  crypto: path.join(shimDir, "crypto.ts"),
  fs: path.join(shimDir, "fs.ts"),
  path: path.join(shimDir, "path.ts"),
  os: path.join(shimDir, "os.ts"),
  child_process: path.join(shimDir, "child_process.ts"),
  // tough-cookie → no-op jar; iOS handles cookies natively via NSHTTPCookieStorage
  "tough-cookie": path.join(shimDir, "tough-cookie.ts"),
  mkdirp: path.join(shimDir, "mkdirp.ts"),
};

// Web-only shims for native Expo modules
const webShims = {
  "expo-secure-store": path.join(shimDir, "secure-store.web.ts"),
  "expo-local-authentication": path.join(shimDir, "local-authentication.web.ts"),
  "expo-sqlite": path.join(shimDir, "sqlite.web.ts"),
  "react-native-quick-crypto": path.join(shimDir, "quick-crypto.web.ts"),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect Node built-ins to RN shims (all platforms)
  if (nodeShims[moduleName]) {
    return { filePath: nodeShims[moduleName], type: "sourceFile" };
  }

  // Redirect native Expo modules to web shims (web only)
  if (platform === "web" && webShims[moduleName]) {
    return { filePath: webShims[moduleName], type: "sourceFile" };
  }

  // Use cheerio's browser build (no node:stream)
  if (moduleName === "cheerio") {
    return {
      filePath: path.resolve(__dirname, "node_modules/cheerio/dist/browser/index.js"),
      type: "sourceFile",
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Ensure scrapers can find node_modules from the repo root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../node_modules"),
];

module.exports = config;
