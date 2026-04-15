// No-op telemetry stub for React Native. The real telemetry module uses
// Node's `os`, `crypto`, and `child_process` (for git config), none of
// which are meaningful on a mobile client.
export function sendTelemetryEvent(): void {}
export async function gatherEnvInfo(): Promise<Record<string, unknown>> {
  return {};
}
