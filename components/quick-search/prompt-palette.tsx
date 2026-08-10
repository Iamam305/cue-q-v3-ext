import { RiFolderLine, RiSearchLine } from '@remixicon/react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { getActiveAdapter } from '@/lib/adapters';
import {
  DEFAULT_PAGE_LIMIT,
  type FolderDto,
  fetchFolders,
  fetchPrompts,
  type PromptDto,
} from '@/lib/api';
import {
  type SearchOutcome,
  type SearchResult,
  searchLibrary,
  shouldExitFolderOnBackspace,
} from '@/lib/quick-search/search';
import { getToken } from '@/lib/storage';
import { cn } from '@/lib/utils';

export type PromptPaletteProps = {
  open: boolean;
  onClose: () => void;
};

function previewText(content: string, max = 80): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

export function PromptPalette({ open, onClose }: PromptPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const [query, setQuery] = useState('');
  const [prompts, setPrompts] = useState<PromptDto[]>([]);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [promptsHasMore, setPromptsHasMore] = useState(false);
  const [foldersHasMore, setFoldersHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const outcome: SearchOutcome = searchLibrary(query, prompts, folders);
  const results: SearchResult[] =
    outcome.status === 'ok' ? outcome.results : [];
  const hasMoreLibrary = promptsHasMore || foldersHasMore;

  const resetTransient = useCallback(() => {
    setQuery('');
    setInsertError(null);
    setSelectedIndex(0);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSignedOut(false);
    try {
      const token = await getToken();
      if (!token) {
        setSignedOut(true);
        setPrompts([]);
        setFolders([]);
        setPromptsHasMore(false);
        setFoldersHasMore(false);
        return;
      }
      const [promptPage, folderPage] = await Promise.all([
        fetchPrompts({ limit: DEFAULT_PAGE_LIMIT, offset: 0 }),
        fetchFolders({ limit: DEFAULT_PAGE_LIMIT, offset: 0 }),
      ]);
      setPrompts(promptPage.prompts);
      setFolders(folderPage.folders);
      setPromptsHasMore(promptPage.pagination.hasMore);
      setFoldersHasMore(folderPage.pagination.hasMore);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load prompts';
      if (message === 'Unauthorized') {
        setSignedOut(true);
      } else {
        setLoadError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreLibrary = useCallback(async () => {
    if (loadingMore || (!promptsHasMore && !foldersHasMore)) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const tasks: Promise<void>[] = [];
      if (promptsHasMore) {
        tasks.push(
          fetchPrompts({
            limit: DEFAULT_PAGE_LIMIT,
            offset: prompts.length,
          }).then((page) => {
            setPrompts((prev) => [...prev, ...page.prompts]);
            setPromptsHasMore(page.pagination.hasMore);
          }),
        );
      }
      if (foldersHasMore) {
        tasks.push(
          fetchFolders({
            limit: DEFAULT_PAGE_LIMIT,
            offset: folders.length,
          }).then((page) => {
            setFolders((prev) => [...prev, ...page.folders]);
            setFoldersHasMore(page.pagination.hasMore);
          }),
        );
      }
      await Promise.all(tasks);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load more';
      if (message === 'Unauthorized') {
        setSignedOut(true);
      } else {
        setLoadError(message);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    promptsHasMore,
    foldersHasMore,
    prompts.length,
    folders.length,
  ]);

  useEffect(() => {
    if (!open) {
      resetTransient();
      return;
    }
    void loadData();
  }, [open, loadData, resetTransient]);

  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, outcome.status]);

  useEffect(() => {
    if (!open || results.length === 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, open, results.length]);

  const enterFolder = useCallback((folder: FolderDto) => {
    setQuery(`${folder.name}/`);
    setInsertError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const insertPrompt = useCallback(
    (prompt: PromptDto) => {
      const adapter = getActiveAdapter();
      const composer = adapter?.findComposer() ?? null;
      if (!composer) {
        setInsertError("Couldn't find the message input.");
        return;
      }
      adapter!.insertText(composer, prompt.content);
      onClose();
      requestAnimationFrame(() => {
        composer.focus();
      });
    },
    [onClose],
  );

  const activateResult = useCallback(
    (result: SearchResult) => {
      if (result.kind === 'folder') {
        enterFolder(result.folder);
        return;
      }
      insertPrompt(result.prompt);
    },
    [enterFolder, insertPrompt],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      if (results.length === 0) return;
      setSelectedIndex((i) => (i + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (results.length === 0) return;
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const result = results[selectedIndex];
      if (result) activateResult(result);
      return;
    }

    if (event.key === 'Backspace') {
      const input = inputRef.current;
      if (!input) return;
      const cursorAtEnd =
        input.selectionStart === query.length &&
        input.selectionEnd === query.length;
      if (shouldExitFolderOnBackspace(query, cursorAtEnd)) {
        event.preventDefault();
        setQuery('');
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-2147483646 flex justify-center"
      style={{ paddingTop: '15vh' }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/35"
        aria-hidden="true"
      />

      <div
        className={cn(
          'relative z-10 flex w-[min(600px,calc(100vw-32px))] max-h-[60vh] flex-col overflow-hidden',
          'rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Search prompts"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <RiSearchLine
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setInsertError(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search prompts..."
            className={cn(
              'min-w-0 flex-1 bg-transparent text-[15px] outline-none',
              'placeholder:text-muted-foreground',
            )}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={
              results[selectedIndex]
                ? `${listId}-item-${selectedIndex}`
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto py-1"
        >
          {signedOut ? (
            <EmptyMessage
              title="Sign in required"
              detail="Open the Cue Q extension popup and sign in to search prompts."
            />
          ) : loading ? (
            <EmptyMessage title="Loading prompts…" />
          ) : loadError ? (
            <EmptyMessage title="Couldn't load prompts" detail={loadError} />
          ) : outcome.status === 'empty_library' ? (
            <EmptyMessage title="No saved prompts yet" />
          ) : outcome.status === 'no_matching_folder' ? (
            <EmptyMessage title="No matching folder" />
          ) : results.length === 0 ? (
            <div>
              <EmptyMessage
                title="No prompts found"
                detail="Try a different search."
              />
              {hasMoreLibrary ? (
                <div className="px-3 pb-3">
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-muted/60"
                    disabled={loadingMore}
                    onClick={() => void loadMoreLibrary()}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {results.map((result, index) => (
                <ResultRow
                  key={
                    result.kind === 'folder'
                      ? `folder-${result.folder.id}`
                      : `prompt-${result.prompt.id}`
                  }
                  id={`${listId}-item-${index}`}
                  index={index}
                  selected={index === selectedIndex}
                  result={result}
                  onHover={() => setSelectedIndex(index)}
                  onSelect={() => activateResult(result)}
                />
              ))}
              {hasMoreLibrary ? (
                <div className="px-3 py-2">
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-muted/60"
                    disabled={loadingMore}
                    onClick={() => void loadMoreLibrary()}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {insertError ? (
          <div className="border-t border-border px-3 py-2 text-xs text-destructive">
            {insertError}
          </div>
        ) : null}

        <div className="flex gap-4 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span>
            <kbd className="font-sans">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="font-sans">↵</kbd> Insert
          </span>
          <span>
            <kbd className="font-sans">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyMessage({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

function ResultRow({
  id,
  index,
  selected,
  result,
  onHover,
  onSelect,
}: {
  id: string;
  index: number;
  selected: boolean;
  result: SearchResult;
  onHover: () => void;
  onSelect: () => void;
}) {
  if (result.kind === 'folder') {
    return (
      <button
        type="button"
        id={id}
        data-index={index}
        role="option"
        aria-selected={selected}
        className={cn(
          'flex w-full items-start gap-2.5 px-3 py-2 text-left',
          selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
        )}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <RiFolderLine className="mt-0.5 size-4 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {result.folder.name}
          </span>
          <span className="block text-xs text-muted-foreground">
            {result.promptCount}{' '}
            {result.promptCount === 1 ? 'prompt' : 'prompts'}
          </span>
        </span>
      </button>
    );
  }

  const { prompt } = result;
  const path = prompt.folderName ?? 'Unfiled';

  return (
    <button
      type="button"
      id={id}
      data-index={index}
      role="option"
      aria-selected={selected}
      className={cn(
        'flex w-full flex-col gap-0.5 px-3 py-2 text-left',
        selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
      )}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <span className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground" aria-hidden>
          ▸
        </span>
        <span className="truncate text-sm font-medium">{prompt.title}</span>
      </span>
      <span
        className={cn(
          'pl-4 text-xs',
          selected ? 'text-accent-foreground/70' : 'text-muted-foreground',
        )}
      >
        {path}
      </span>
      {prompt.content ? (
        <span
          className={cn(
            'pl-4 truncate text-xs',
            selected ? 'text-accent-foreground/55' : 'text-muted-foreground/80',
          )}
        >
          {previewText(prompt.content)}
        </span>
      ) : null}
    </button>
  );
}
