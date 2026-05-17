/**
 * Globally-configurable log singleton for the scraper layer.
 *
 * The scrapers emit a steady stream of progress messages — HTTP status,
 * cookie state, parsed login-page diagnostics, etc. These are debug-level
 * information that the consumer (CLI, web app, MCP server, tests) decides
 * how to surface.
 *
 * Default behavior matches what `console.*` would do — debug/info to
 * stdout, warn/error to stderr — so callers that don't configure anything
 * see the same output they always did.
 *
 * Stdio MCP servers MUST configure a sink that never writes to stdout,
 * because the JSON-RPC framing on stdout doesn't tolerate non-JSON text.
 * Example:
 *
 *   import { setLogSink } from '../../shared/logger';
 *   setLogSink((level, args) => console.error(`[${level}]`, ...args));
 *
 * Tests can silence the chatter with `silenceLogger()`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogSink = (level: LogLevel, args: unknown[]) => void;

const defaultSink: LogSink = (level, args) => {
  // Mirror console.* defaults: debug/info → stdout, warn/error → stderr.
  if (level === 'warn') console.warn(...args);
  else if (level === 'error') console.error(...args);
  else console.log(...args);
};

let activeSink: LogSink = defaultSink;

export const logger = {
  debug(...args: unknown[]): void { activeSink('debug', args); },
  info(...args: unknown[]): void  { activeSink('info', args);  },
  warn(...args: unknown[]): void  { activeSink('warn', args);  },
  error(...args: unknown[]): void { activeSink('error', args); },
};

/**
 * Replace the sink that receives every logger.* call. Pass a custom
 * function to filter, format, redirect, or drop messages.
 */
export function setLogSink(sink: LogSink): void {
  activeSink = sink;
}

/** Restore the default console-based sink. */
export function resetLogSink(): void {
  activeSink = defaultSink;
}

/** Drop every log message. Useful in tests. */
export function silenceLogger(): void {
  activeSink = () => { /* no-op */ };
}

/** Inspect the active sink (for testing). */
export function getLogSink(): LogSink {
  return activeSink;
}
