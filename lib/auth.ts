import { APP_URL } from '@/lib/config';
import {
  clearSession,
  type CueqUser,
  getToken,
  setSession,
} from '@/lib/storage';

type ExchangeResponse = {
  token: string;
  expiresAt?: string;
  user: CueqUser;
  error?: string;
};

function parseRedirectParams(redirectedTo: string): {
  code: string;
  state: string;
} {
  const url = new URL(redirectedTo);
  const code =
    url.searchParams.get('code') ??
    new URLSearchParams(url.hash.replace(/^#/, '')).get('code');
  const state =
    url.searchParams.get('state') ??
    new URLSearchParams(url.hash.replace(/^#/, '')).get('state');

  if (!code || !state) {
    throw new Error('Auth response missing code or state');
  }

  return { code, state };
}

export async function loginWithChromeIdentity(): Promise<CueqUser> {
  const extensionId = browser.runtime.id;
  const redirectUri = browser.identity.getRedirectURL();
  const state = crypto.randomUUID();

  const url = new URL(`${APP_URL}/api/extension/auth`);
  url.searchParams.set('extensionId', extensionId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  const redirectedTo = await browser.identity.launchWebAuthFlow({
    url: url.toString(),
    interactive: true,
  });

  if (!redirectedTo) {
    throw new Error('Sign-in was cancelled');
  }

  const { code, state: returnedState } = parseRedirectParams(redirectedTo);

  if (returnedState !== state) {
    throw new Error('Invalid auth state');
  }

  const res = await fetch(`${APP_URL}/api/extension/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, extensionId, state }),
  });

  const data = (await res.json()) as ExchangeResponse;

  if (!res.ok || !data.token || !data.user) {
    throw new Error(data.error || `Sign-in failed (${res.status})`);
  }

  await setSession({
    token: data.token,
    expiresAt: data.expiresAt,
    user: data.user,
  });

  return data.user;
}

export async function logout(): Promise<void> {
  await clearSession();
}

export async function hasStoredSession(): Promise<boolean> {
  return (await getToken()) !== null;
}
