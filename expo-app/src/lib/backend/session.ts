import { getSecureValue, setSecureValue, deleteSecureValue } from "@/lib/storage/secure-store";

const TOKEN_KEY = "backend_session_token";
const USER_KEY = "backend_user";

export type BackendUser = {
  id: string;
  email: string;
  name?: string;
};

export type BackendSession = {
  token: string;
  user: BackendUser;
};

export async function getBackendSession(): Promise<BackendSession | null> {
  const [token, userRaw] = await Promise.all([
    getSecureValue(TOKEN_KEY),
    getSecureValue(USER_KEY),
  ]);
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) as BackendUser };
  } catch {
    return null;
  }
}

export async function setBackendSession(session: BackendSession): Promise<void> {
  await Promise.all([
    setSecureValue(TOKEN_KEY, session.token),
    setSecureValue(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function clearBackendSession(): Promise<void> {
  await Promise.all([
    deleteSecureValue(TOKEN_KEY),
    deleteSecureValue(USER_KEY),
  ]);
}
