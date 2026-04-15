/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Stub for Node's `os` module. Never used at runtime in the mobile app.
 */
export function homedir() { return "/"; }
export function platform() { return "ios"; }
export function tmpdir() { return "/tmp"; }
export default { homedir, platform, tmpdir };
