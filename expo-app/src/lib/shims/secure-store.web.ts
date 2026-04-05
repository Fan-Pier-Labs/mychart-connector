/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Web shim for expo-secure-store — uses localStorage.
 * Only for development/testing. Not secure for production.
 */

export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 0;

export type SecureStoreOptions = {
  keychainAccessible?: number;
};

export async function getItemAsync(key: string, _options?: SecureStoreOptions): Promise<string | null> {
  return localStorage.getItem(`secure_${key}`);
}

export async function setItemAsync(key: string, value: string, _options?: SecureStoreOptions): Promise<void> {
  localStorage.setItem(`secure_${key}`, value);
}

export async function deleteItemAsync(key: string, _options?: SecureStoreOptions): Promise<void> {
  localStorage.removeItem(`secure_${key}`);
}
