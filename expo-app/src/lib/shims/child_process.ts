/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Stub for Node's `child_process` module. Never used at runtime in the mobile app.
 */
export function execSync() { throw new Error("child_process not available in React Native"); }
export default { execSync };
