import type { FolderDto, PromptDto } from '@/lib/api';

export type ParsedQuery = {
  /** Raw text before the last `/`, or null if no slash. */
  folderPrefix: string | null;
  /** Text after the last `/`, or the full query when no slash. */
  remainder: string;
  /** True when query contains a `/`. */
  hasFolderDelimiter: boolean;
};

export type FolderResult = {
  kind: 'folder';
  folder: FolderDto;
  promptCount: number;
  score: number;
};

export type PromptResult = {
  kind: 'prompt';
  prompt: PromptDto;
  score: number;
};

export type SearchResult = FolderResult | PromptResult;

export type SearchOutcome =
  | { status: 'ok'; results: SearchResult[] }
  | { status: 'no_matching_folder' }
  | { status: 'empty_library' };

export function parseQuery(raw: string): ParsedQuery {
  const query = raw;
  const slash = query.lastIndexOf('/');
  if (slash === -1) {
    return {
      folderPrefix: null,
      remainder: query.trim(),
      hasFolderDelimiter: false,
    };
  }
  return {
    folderPrefix: query.slice(0, slash).trim(),
    remainder: query.slice(slash + 1).trim(),
    hasFolderDelimiter: true,
  };
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Subsequence fuzzy score; higher is better. 0 = no match. */
function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 1;
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!h) return 0;
  if (h === n) return 1000;
  if (h.startsWith(n)) return 800 + Math.min(n.length, 50);
  if (h.includes(n)) return 600 + Math.min(n.length, 50);

  let hi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  let matched = 0;
  for (let ni = 0; ni < n.length; ni++) {
    const ch = n[ni]!;
    let found = false;
    while (hi < h.length) {
      if (h[hi] === ch) {
        matched++;
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
        hi++;
        found = true;
        break;
      }
      consecutive = 0;
      hi++;
    }
    if (!found) return 0;
  }
  return 100 + matched * 10 + maxConsecutive * 20;
}

function promptRank(prompt: PromptDto, query: string): number {
  if (!query) return 1;
  const title = prompt.title;
  const folder = prompt.folderName ?? '';
  const nq = normalize(query);
  const nt = normalize(title);
  const nf = normalize(folder);

  if (nt === nq) return 1000;
  if (nt.startsWith(nq)) return 900;
  if (nt.includes(nq)) return 700;

  const folderExact = nf === nq ? 500 : 0;
  const folderStarts = nf.startsWith(nq) ? 450 : 0;
  const folderContains = nf.includes(nq) ? 400 : 0;
  const folderScore = Math.max(folderExact, folderStarts, folderContains);

  const fuzzy = fuzzyScore(title, query);
  if (fuzzy > 0) return Math.max(fuzzy, folderScore);
  return folderScore;
}

function folderRank(folder: FolderDto, query: string): number {
  if (!query) return 1;
  const name = folder.name;
  const nq = normalize(query);
  const nn = normalize(name);
  if (nn === nq) return 1000;
  if (nn.startsWith(nq)) return 900;
  if (nn.includes(nq)) return 700;
  return fuzzyScore(name, query);
}

function findFolderByName(
  folders: FolderDto[],
  name: string,
): FolderDto | null {
  const n = normalize(name);
  if (!n) return null;
  return folders.find((f) => normalize(f.name) === n) ?? null;
}

export function searchLibrary(
  query: string,
  prompts: PromptDto[],
  folders: FolderDto[],
): SearchOutcome {
  if (prompts.length === 0 && folders.length === 0) {
    return { status: 'empty_library' };
  }

  const parsed = parseQuery(query);
  let scopedPrompts = prompts;
  let activeFolder: FolderDto | null = null;

  if (parsed.hasFolderDelimiter) {
    if (!parsed.folderPrefix) {
      // Leading "/" — treat as root with remainder only
      scopedPrompts = prompts;
    } else {
      activeFolder = findFolderByName(folders, parsed.folderPrefix);
      if (!activeFolder) {
        return { status: 'no_matching_folder' };
      }
      scopedPrompts = prompts.filter((p) => p.folderId === activeFolder!.id);
    }
  }

  const remainder = parsed.remainder;
  const results: SearchResult[] = [];

  // Folder results only when not inside a resolved folder context
  if (!activeFolder) {
    const folderQuery = parsed.hasFolderDelimiter
      ? parsed.folderPrefix ?? ''
      : remainder;
    // When user typed "foo/" with unmatched empty folder name we already handled.
    // At root, show matching folders for the remainder (or all when empty).
    if (!parsed.hasFolderDelimiter) {
      for (const folder of folders) {
        const score = folderRank(folder, folderQuery);
        if (score > 0 || !folderQuery) {
          results.push({
            kind: 'folder',
            folder,
            promptCount: prompts.filter((p) => p.folderId === folder.id).length,
            score: folderQuery ? score : 1,
          });
        }
      }
    }
  }

  for (const prompt of scopedPrompts) {
    const score = promptRank(prompt, remainder);
    if (score > 0 || !remainder) {
      results.push({
        kind: 'prompt',
        prompt,
        score: remainder ? score : 1,
      });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Folders before prompts on equal score when browsing
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    const an = a.kind === 'folder' ? a.folder.name : a.prompt.title;
    const bn = b.kind === 'folder' ? b.folder.name : b.prompt.title;
    return an.localeCompare(bn);
  });

  return { status: 'ok', results };
}

/** True when Backspace should clear the folder context (`FolderName/`). */
export function shouldExitFolderOnBackspace(
  query: string,
  cursorAtEnd: boolean,
): boolean {
  if (!cursorAtEnd) return false;
  const parsed = parseQuery(query);
  return (
    parsed.hasFolderDelimiter &&
    !!parsed.folderPrefix &&
    parsed.remainder === '' &&
    query.endsWith('/')
  );
}
