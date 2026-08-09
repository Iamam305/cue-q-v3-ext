import { APP_URL } from '@/lib/config';
import { clearSession, getToken, type CueqUser } from '@/lib/storage';

export type FolderDto = {
  id: string;
  organizationId: string;
  ownerId: string;
  name: string;
  isShared: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type PromptDto = {
  id: string;
  organizationId: string;
  ownerId: string;
  folderId: string | null;
  folderName: string | null;
  folderIsShared: boolean | null;
  title: string;
  content: string;
  isShared: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type MeResponse = {
  user: CueqUser;
  session: {
    id: string;
    expiresAt: string | Date;
    activeOrganizationId: string | null;
  };
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data === 'object' && data && 'error' in data && data.error
        ? String(data.error)
        : `Request failed (${res.status})`,
    );
  }
  return data;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getToken();
  if (!token) {
    throw new Error('Unauthorized');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${APP_URL}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    await clearSession();
  }

  return res;
}

export async function getMe(): Promise<MeResponse> {
  const res = await apiFetch('/api/me');
  return parseJson<MeResponse>(res);
}

export async function fetchFolders(q?: string): Promise<FolderDto[]> {
  const params = new URLSearchParams();
  if (q?.trim()) {
    params.set('q', q.trim());
  }
  const qs = params.toString();
  const res = await apiFetch(`/api/folders${qs ? `?${qs}` : ''}`);
  const data = await parseJson<{ folders: FolderDto[] }>(res);
  return data.folders;
}

export async function createFolderApi(input: {
  name: string;
  isShared?: boolean;
}): Promise<FolderDto> {
  const res = await apiFetch('/api/folders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ folder: FolderDto }>(res);
  return data.folder;
}

export async function updateFolderApi(
  id: string,
  input: { name?: string; isShared?: boolean },
): Promise<FolderDto> {
  const res = await apiFetch(`/api/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ folder: FolderDto }>(res);
  return data.folder;
}

export async function deleteFolderApi(id: string): Promise<void> {
  const res = await apiFetch(`/api/folders/${id}`, { method: 'DELETE' });
  await parseJson<{ ok: boolean }>(res);
}

export async function fetchPrompts(input?: {
  q?: string;
  folderId?: string | null;
  shared?: boolean;
}): Promise<PromptDto[]> {
  const params = new URLSearchParams();
  if (input?.q?.trim()) {
    params.set('q', input.q.trim());
  }
  if (input?.folderId === null) {
    params.set('folderId', 'null');
  } else if (typeof input?.folderId === 'string') {
    params.set('folderId', input.folderId);
  }
  if (input?.shared === true) {
    params.set('shared', 'true');
  } else if (input?.shared === false) {
    params.set('shared', 'false');
  }
  const qs = params.toString();
  const res = await apiFetch(`/api/prompts${qs ? `?${qs}` : ''}`);
  const data = await parseJson<{ prompts: PromptDto[] }>(res);
  return data.prompts;
}

export async function createPromptApi(input: {
  title: string;
  content: string;
  folderId?: string | null;
  isShared?: boolean;
}): Promise<PromptDto> {
  const res = await apiFetch('/api/prompts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ prompt: PromptDto }>(res);
  return data.prompt;
}

export async function updatePromptApi(
  id: string,
  input: {
    title?: string;
    content?: string;
    folderId?: string | null;
    isShared?: boolean;
  },
): Promise<PromptDto> {
  const res = await apiFetch(`/api/prompts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ prompt: PromptDto }>(res);
  return data.prompt;
}

export async function deletePromptApi(id: string): Promise<void> {
  const res = await apiFetch(`/api/prompts/${id}`, { method: 'DELETE' });
  await parseJson<{ ok: boolean }>(res);
}
