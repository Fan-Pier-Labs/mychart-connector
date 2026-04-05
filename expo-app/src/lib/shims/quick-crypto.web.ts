/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Web shim for react-native-quick-crypto.
 * Passkey operations aren't available on web — this just prevents import crashes.
 */

function notSupported(): never {
  throw new Error("Crypto operations require a native build (iOS/Android).");
}

export default {
  createHash: notSupported,
  generateKeyPairSync: notSupported,
  randomBytes: notSupported,
  sign: notSupported,
  createPrivateKey: notSupported,
};
