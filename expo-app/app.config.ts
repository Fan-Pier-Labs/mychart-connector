import type { ExpoConfig } from "expo/config";

// Google OAuth client IDs. These are not secrets — iOS bakes the reversed
// client ID into its Info.plist URL schemes and ships it in every IPA, and
// the web client ID is used client-side too. Stored in AWS Secrets Manager
// under GOOGLE_OAUTH_CREDENTIALS for server parity; kept here as defaults
// so local builds work without a Secrets Manager lookup.
const GOOGLE_WEB_CLIENT_ID =
  "810533222194-p2dod0idou95jlh70qi07m84uscb4170.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID =
  "810533222194-hhcn0nkf1mgelfrgq5vogbsjuemmvde8.apps.googleusercontent.com";
const GOOGLE_IOS_URL_SCHEME =
  "com.googleusercontent.apps.810533222194-hhcn0nkf1mgelfrgq5vogbsjuemmvde8";

const iosUrlScheme =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? GOOGLE_IOS_URL_SCHEME;

const googleSigninPlugin: [string, { iosUrlScheme: string }] = [
  "@react-native-google-signin/google-signin",
  { iosUrlScheme },
];

const config: ExpoConfig = {
  name: "OpenRecord",
  slug: "openrecord",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "openrecord",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.fanpierlabs.openrecord",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSFaceIDUsageDescription: "OpenRecord uses Face ID to protect your health data.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    package: "com.fanpierlabs.openrecord",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-font",
    "expo-local-authentication",
    googleSigninPlugin,
  ],
  extra: {
    eas: {
      projectId: "6ed85fb8-688f-44c3-8ecb-e8019524f524",
    },
    backendUrl:
      process.env.EXPO_PUBLIC_BACKEND_URL ??
      "https://openrecord.fanpierlabs.com",
    googleWebClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? GOOGLE_WEB_CLIENT_ID,
    googleIosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? GOOGLE_IOS_CLIENT_ID,
  },
};

export default config;
