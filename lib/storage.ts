export type CueqUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

const TOKEN_KEY = 'cueqBearerToken';
const USER_KEY = 'cueqUser';
const EXPIRES_KEY = 'cueqExpiresAt';

export async function getToken(): Promise<string | null> {
  const result = await browser.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export async function getUser(): Promise<CueqUser | null> {
  const result = await browser.storage.local.get(USER_KEY);
  const user = result[USER_KEY];
  if (!user || typeof user !== 'object') return null;
  return user as CueqUser;
}

export async function setSession(input: {
  token: string;
  expiresAt?: string;
  user: CueqUser;
}): Promise<void> {
  await browser.storage.local.set({
    [TOKEN_KEY]: input.token,
    [USER_KEY]: input.user,
    [EXPIRES_KEY]: input.expiresAt ?? null,
  });
}

export async function clearSession(): Promise<void> {
  await browser.storage.local.remove([TOKEN_KEY, USER_KEY, EXPIRES_KEY]);
}
