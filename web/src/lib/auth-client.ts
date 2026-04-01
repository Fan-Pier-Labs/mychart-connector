"use client";

import { createAuthClient } from 'better-auth/react';
import { twoFactorClient, magicLinkClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  plugins: [
    twoFactorClient(),
    magicLinkClient(),
    passkeyClient(),
  ],
});
