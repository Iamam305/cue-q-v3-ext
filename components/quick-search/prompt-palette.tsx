import { RiSearchLine } from '@remixicon/react';
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
  fetchQuickSearchPrompts,
  type PromptDto,
} from '@/lib/api';
import { shouldExitFolderOnBackspace } from '@/lib/quick-search/search';
import { getToken } from '@/lib/storage';
import { cn } from '@/lib/utils';

const SEARCH_DEBOUNCE_MS = 180;

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
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [prompts, setPrompts] = useState<PromptDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [folderNotFound, setFolderNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const resetTransient = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setInsertError(null);
    setSelectedIndex(0);
    setPrompts([]);
    setHasMore(false);
    setFolderNotFound(false);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  const loadPage = useCallback(
    async (searchQuery: string, offset: number, append: boolean) => {
      const requestId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);
      setSignedOut(false);

      try {
        const token = await getToken();
        if (!token) {
          if (requestId !== requestIdRef.current) return;
          setSignedOut(true);
          setPrompts([]);
          setHasMore(false);
          setFolderNotFound(false);
          return;
        }

        const page = await fetchQuickSearchPrompts({
          q: searchQuery,
          limit: DEFAULT_PAGE_LIMIT,
          offset,
        });

        if (requestId !== requestIdRef.current) return;

        setPrompts((prev) =>
          append ? [...prev, ...page.prompts] : page.prompts,
        );
        setHasMore(page.pagination.hasMore);
        setFolderNotFound(page.folderNotFound === true);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load prompts';
        if (message === 'Unauthorized') {
          setSignedOut(true);
        } else {
          setLoadError(message);
        }
        if (!append) {
          setPrompts([]);
          setHasMore(false);
          setFolderNotFound(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      resetTransient();
      return;
    }
    void loadPage(debouncedQuery, 0, false);
  }, [open, debouncedQuery, loadPage, resetTransient]);

  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery, folderNotFound]);

  useEffect(() => {
    if (!open || prompts.length === 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, open, prompts.length]);

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

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    void loadPage(debouncedQuery, prompts.length, true);
  }, [
    loadingMore,
    hasMore,
    loading,
    loadPage,
    debouncedQuery,
    prompts.length,
  ]);

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
      if (prompts.length === 0) return;
      setSelectedIndex((i) => (i + 1) % prompts.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (prompts.length === 0) return;
      setSelectedIndex((i) => (i - 1 + prompts.length) % prompts.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const prompt = prompts[selectedIndex];
      if (prompt) insertPrompt(prompt);
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
              prompts[selectedIndex]
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
          ) : folderNotFound ? (
            <EmptyMessage title="No matching folder" />
          ) : prompts.length === 0 ? (
            <EmptyMessage
              title="No prompts found"
              detail="Try a different search."
            />
          ) : (
            <>
              {prompts.map((prompt, index) => (
                <ResultRow
                  key={prompt.id}
                  id={`${listId}-item-${index}`}
                  index={index}
                  selected={index === selectedIndex}
                  prompt={prompt}
                  onHover={() => setSelectedIndex(index)}
                  onSelect={() => insertPrompt(prompt)}
                />
              ))}
              {hasMore ? (
                <div className="px-3 py-2">
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-muted/60"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
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
  prompt,
  onHover,
  onSelect,
}: {
  id: string;
  index: number;
  selected: boolean;
  prompt: PromptDto;
  onHover: () => void;
  onSelect: () => void;
}) {
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
