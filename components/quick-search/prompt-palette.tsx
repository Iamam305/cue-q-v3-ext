import { RiSearchLine } from '@remixicon/react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Badge } from '@/components/ui/badge';
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
  const loadedQueryRef = useRef('');
  const wasOpenRef = useRef(false);

  const [query, setQuery] = useState('');
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
    setInsertError(null);
    setSelectedIndex(0);
    setPrompts([]);
    setHasMore(false);
    setFolderNotFound(false);
    setLoadError(null);
  }, []);

  const loadPage = useCallback(
    async (searchQuery: string, offset: number, append: boolean) => {
      const requestId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setSelectedIndex(0);
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

        loadedQueryRef.current = searchQuery;
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
      wasOpenRef.current = false;
      resetTransient();
      return;
    }

    const delay = wasOpenRef.current ? SEARCH_DEBOUNCE_MS : 0;
    wasOpenRef.current = true;
    const timer = window.setTimeout(() => {
      void loadPage(query, 0, false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [open, query, loadPage, resetTransient]);

  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Keep focus inside the shadow UI — Claude (and similar) steal it because
  // document.activeElement is the shadow host, not the search input.
  useEffect(() => {
    if (!open) return;

    const input = inputRef.current;
    if (!input) return;

    const root = input.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : null;

    const inerted: HTMLElement[] = [];
    if (host) {
      for (const child of Array.from(document.body.children)) {
        if (child !== host && child instanceof HTMLElement && !child.inert) {
          child.inert = true;
          inerted.push(child);
        }
      }
    }

    const onFocusIn = (event: FocusEvent) => {
      if (host && event.composedPath().includes(host)) return;
      input.focus({ preventScroll: true });
    };

    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      document.removeEventListener('focusin', onFocusIn, true);
      for (const el of inerted) {
        el.inert = false;
      }
    };
  }, [open]);

  const insertPrompt = useCallback(
    (prompt: PromptDto) => {
      const adapter = getActiveAdapter();
      const composer = adapter?.findComposer() ?? null;
      if (!adapter || !composer) {
        setInsertError("Couldn't find the message input.");
        return;
      }
      adapter.insertText(composer, prompt.content);
      onClose();
      requestAnimationFrame(() => {
        composer.focus();
      });
    },
    [onClose],
  );

  const scrollToIndex = (index: number) => {
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    void loadPage(loadedQueryRef.current, prompts.length, true);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    // Always stop bubbling so the host page (esp. Claude) never sees palette keys.
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (prompts.length === 0) return;
      const next = (selectedIndex + 1) % prompts.length;
      setSelectedIndex(next);
      scrollToIndex(next);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (prompts.length === 0) return;
      const next = (selectedIndex - 1 + prompts.length) % prompts.length;
      setSelectedIndex(next);
      scrollToIndex(next);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
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
    >
      <div
        className="absolute inset-0 bg-black/35"
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          onClose();
        }}
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
        <SearchHeader
          inputRef={inputRef}
          query={query}
          listId={listId}
          activeDescendant={
            prompts[selectedIndex]
              ? `${listId}-item-${selectedIndex}`
              : undefined
          }
          onQueryChange={(value) => {
            setQuery(value);
            setInsertError(null);
          }}
          onKeyDown={onKeyDown}
        />

        <ResultList
          listRef={listRef}
          listId={listId}
          signedOut={signedOut}
          loading={loading}
          loadError={loadError}
          folderNotFound={folderNotFound}
          prompts={prompts}
          selectedIndex={selectedIndex}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onHover={setSelectedIndex}
          onSelect={insertPrompt}
          onLoadMore={loadMore}
        />

        {insertError ? (
          <div className="border-t border-border px-3 py-2 text-xs text-destructive">
            {insertError}
          </div>
        ) : null}

        <PaletteFooter />
      </div>
    </div>
  );
}

function SearchHeader({
  inputRef,
  query,
  listId,
  activeDescendant,
  onQueryChange,
  onKeyDown,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  listId: string;
  activeDescendant?: string;
  onQueryChange: (value: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <RiSearchLine
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search prompts..."
        className={cn(
          'min-w-0 flex-1 bg-transparent text-[15px] outline-none',
          'placeholder:text-muted-foreground',
        )}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={activeDescendant}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

function ResultList({
  listRef,
  listId,
  signedOut,
  loading,
  loadError,
  folderNotFound,
  prompts,
  selectedIndex,
  hasMore,
  loadingMore,
  onHover,
  onSelect,
  onLoadMore,
}: {
  listRef: RefObject<HTMLDivElement | null>;
  listId: string;
  signedOut: boolean;
  loading: boolean;
  loadError: string | null;
  folderNotFound: boolean;
  prompts: PromptDto[];
  selectedIndex: number;
  hasMore: boolean;
  loadingMore: boolean;
  onHover: (index: number) => void;
  onSelect: (prompt: PromptDto) => void;
  onLoadMore: () => void;
}) {
  let body: ReactNode;
  if (signedOut) {
    body = (
      <EmptyMessage
        title="Sign in required"
        detail="Open the Cue Q extension popup and sign in to search prompts."
      />
    );
  } else if (loading) {
    body = <EmptyMessage title="Loading prompts…" />;
  } else if (loadError) {
    body = <EmptyMessage title="Couldn't load prompts" detail={loadError} />;
  } else if (folderNotFound) {
    body = <EmptyMessage title="No matching folder" />;
  } else if (prompts.length === 0) {
    body = (
      <EmptyMessage title="No prompts found" detail="Try a different search." />
    );
  } else {
    body = (
      <>
        {prompts.map((prompt, index) => (
          <ResultRow
            key={prompt.id}
            id={`${listId}-item-${index}`}
            index={index}
            selected={index === selectedIndex}
            prompt={prompt}
            onHover={() => onHover(index)}
            onSelect={() => onSelect(prompt)}
          />
        ))}
        {hasMore ? (
          <div className="px-3 py-2">
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-muted/60"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      className="min-h-0 flex-1 overflow-y-auto py-1"
    >
      {body}
    </div>
  );
}

function PaletteFooter() {
  return (
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
  const description = prompt.content ? previewText(prompt.content) : '';

  return (
    <button
      type="button"
      id={id}
      data-index={index}
      role="option"
      aria-selected={selected}
      className={cn(
        'flex w-full flex-col gap-0.5 px-3 py-1.5 text-left',
        selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
      )}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {prompt.title}
        </span>
        <Badge
          variant="secondary"
          className="h-4 shrink-0 px-1.5 text-[10px] font-medium"
        >
          {prompt.folderName ?? 'Unfiled'}
        </Badge>
      </span>
      {description ? (
        <span
          className={cn(
            'truncate text-xs',
            selected ? 'text-accent-foreground/55' : 'text-muted-foreground/80',
          )}
        >
          {description}
        </span>
      ) : null}
    </button>
  );
}
