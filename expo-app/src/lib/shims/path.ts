/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Stub for Node's `path` module. Only used by shared/util.ts (changeDirToPackageRoot)
 * which is never called at runtime in the mobile app.
 */
export function join(...parts: string[]) { return parts.join("/"); }
export function resolve(...parts: string[]) { return parts.join("/"); }
export function dirname(p: string) { return p.split("/").slice(0, -1).join("/"); }
export function basename(p: string) { return p.split("/").pop() || ""; }
export function extname(p: string) { const m = p.match(/\.[^.]+$/); return m ? m[0] : ""; }
export default { join, resolve, dirname, basename, extname };
