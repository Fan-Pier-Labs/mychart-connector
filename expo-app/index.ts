// Buffer polyfill — required by shared scraper code that uses Node's Buffer,
// notably the eUnity CLO image parser and binary AMF3 protocol helpers.
import { Buffer } from "buffer";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (global as any).Buffer === "undefined") (global as any).Buffer = Buffer;

import "expo-router/entry";
