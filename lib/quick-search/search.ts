export type ParsedQuery = {
  /** Raw text before the last `/`, or null if no slash. */
  folderPrefix: string | null;
  /** Text after the last `/`, or the full query when no slash. */
  remainder: string;
  /** True when query contains a `/`. */
  hasFolderDelimiter: boolean;
};

export function parseQuery(raw: string): ParsedQuery {
  const slash = raw.lastIndexOf('/');
  if (slash === -1) {
    return {
      folderPrefix: null,
      remainder: raw.trim(),
      hasFolderDelimiter: false,
    };
  }
  return {
    folderPrefix: raw.slice(0, slash).trim(),
    remainder: raw.slice(slash + 1).trim(),
    hasFolderDelimiter: true,
  };
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
