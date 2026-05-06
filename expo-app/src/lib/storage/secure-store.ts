import * as SecureStore from "expo-secure-store";

const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// ─── Generic helpers ───

export async function getSecureValue(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
}

export async function setSecureValue(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(key, value, KEYCHAIN_OPTIONS);
}

export async function deleteSecureValue(key: string): Promise<void> {
  return SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS);
}

// ─── Claude API Key ───

// Dev fallback: load API key from secrets.local.json at bundle time.
// In production builds this will be an empty object (file won't exist).
let devSecrets: {
  claude_api_key?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
  ai_provider?: AiProvider;
} = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  devSecrets = require("../../../secrets.local.json");
} catch {
  // Not present — expected in production
}

export async function getClaudeApiKey(): Promise<string | null> {
  if (devSecrets.claude_api_key) {
    await setClaudeApiKey(devSecrets.claude_api_key);
    return devSecrets.claude_api_key;
  }
  return getSecureValue("claude_api_key");
}

export async function setClaudeApiKey(key: string): Promise<void> {
  return setSecureValue("claude_api_key", key);
}

// ─── MyChart Credentials ───

export type StoredMyChartAccount = {
  id: string;
  hostname: string;
  username: string;
  password: string;
  totpSecret?: string;
  passkeyCredential?: string; // JSON-serialized PasskeyCredential
};

const ACCOUNTS_KEY = "mychart_accounts";

export async function getMyChartAccounts(): Promise<StoredMyChartAccount[]> {
  const raw = await getSecureValue(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveMyChartAccounts(accounts: StoredMyChartAccount[]): Promise<void> {
  return setSecureValue(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function addMyChartAccount(account: Omit<StoredMyChartAccount, "id">): Promise<StoredMyChartAccount> {
  const accounts = await getMyChartAccounts();
  const newAccount: StoredMyChartAccount = {
    ...account,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  };
  accounts.push(newAccount);
  await saveMyChartAccounts(accounts);
  return newAccount;
}

export async function updateMyChartAccount(id: string, updates: Partial<StoredMyChartAccount>): Promise<void> {
  const accounts = await getMyChartAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...updates };
    await saveMyChartAccounts(accounts);
  }
}

export async function removeMyChartAccount(id: string): Promise<void> {
  const accounts = await getMyChartAccounts();
  await saveMyChartAccounts(accounts.filter((a) => a.id !== id));
}

// ─── Settings ───

export async function getSelectedModel(): Promise<string> {
  return (await getSecureValue("selected_model")) || "gemini-2.5-flash";
}

export async function setSelectedModel(model: string): Promise<void> {
  return setSecureValue("selected_model", model);
}

export type AiProvider = "free" | "openai" | "anthropic" | "gemini";

export async function getAiProvider(): Promise<AiProvider> {
  if (devSecrets.ai_provider) {
    await setAiProvider(devSecrets.ai_provider);
    return devSecrets.ai_provider;
  }
  const v = await getSecureValue("ai_provider");
  if (v === "openai" || v === "anthropic" || v === "gemini" || v === "free") return v;
  return "free";
}

export async function setAiProvider(p: AiProvider): Promise<void> {
  return setSecureValue("ai_provider", p);
}

export async function getOpenAiApiKey(): Promise<string | null> {
  return getSecureValue("openai_api_key");
}

export async function setOpenAiApiKey(key: string): Promise<void> {
  return setSecureValue("openai_api_key", key);
}

export async function getGeminiApiKey(): Promise<string | null> {
  if (devSecrets.gemini_api_key) {
    await setGeminiApiKey(devSecrets.gemini_api_key);
    return devSecrets.gemini_api_key;
  }
  return getSecureValue("gemini_api_key");
}

export async function setGeminiApiKey(key: string): Promise<void> {
  return setSecureValue("gemini_api_key", key);
}
