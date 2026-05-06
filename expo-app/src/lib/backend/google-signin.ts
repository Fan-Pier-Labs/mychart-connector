import Constants from "expo-constants";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { backendUrl } from "./client";
import { setBackendSession, type BackendUser } from "./session";

let configured = false;

function configure() {
  if (configured) return;
  const extra = Constants.expoConfig?.extra as
    | { googleWebClientId?: string; googleIosClientId?: string }
    | undefined;
  const webClientId = extra?.googleWebClientId;
  const iosClientId = extra?.googleIosClientId;
  if (!webClientId) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set — cannot sign in with Google.",
    );
  }
  GoogleSignin.configure({
    webClientId,
    iosClientId,
    // Ask for an ID token so the backend can verify the Google identity.
    offlineAccess: false,
  });
  configured = true;
}

/**
 * Open the native Google sign-in sheet, forward the resulting ID token
 * to the backend, and persist the returned session token.
 */
export async function signInWithGoogle(): Promise<BackendUser> {
  configure();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();

  // google-signin v13 wraps the payload in { type, data }.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = (result as any).data ?? result;
  const idToken: string | undefined = payload?.idToken;
  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const response = await fetch(backendUrl("/api/auth/sign-in/social"), {
    method: "POST",
    credentials: "omit",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Origin: "openrecord://",
    },
    body: JSON.stringify({
      provider: "google",
      idToken: { token: idToken },
      disableRedirect: true,
    }),
  });

  if (!response.ok && response.type !== "opaqueredirect") {
    const body = await response.text();
    throw new Error(`Backend sign-in failed (${response.status}): ${body}`);
  }

  const sessionToken =
    response.headers.get("set-auth-token") ??
    response.headers.get("Set-Auth-Token") ??
    "";

  const rawBody = await response.text();
  let data: { token?: string; session?: { token?: string }; user?: { id?: string; email?: string; name?: string } } = {};
  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Server returned a non-JSON body (e.g. HTML redirect page). Fall back
      // to the bearer-token header if present.
    }
  }

  const token: string = sessionToken || data?.token || data?.session?.token || "";
  if (!token) {
    throw new Error("Backend did not return a session token.");
  }

  const backendUser: BackendUser = {
    id: data?.user?.id ?? "",
    email: data?.user?.email ?? "",
    name: data?.user?.name,
  };
  await setBackendSession({ token, user: backendUser });
  return backendUser;
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
}

export { statusCodes as googleStatusCodes };
