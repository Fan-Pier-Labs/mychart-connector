/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Web shim for expo-local-authentication — always succeeds.
 */

export async function hasHardwareAsync(): Promise<boolean> {
  return false;
}

export async function isEnrolledAsync(): Promise<boolean> {
  return false;
}

export async function authenticateAsync(_options?: {
  promptMessage?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}): Promise<{ success: boolean }> {
  return { success: true };
}
