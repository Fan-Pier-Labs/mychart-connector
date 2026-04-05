/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Shim: maps Node's `crypto` to `react-native-quick-crypto`.
 * The main repo's softwareAuthenticator.ts imports `crypto` — this redirect
 * makes it work in React Native without forking the file.
 */
export { default } from "react-native-quick-crypto";
export * from "react-native-quick-crypto";
