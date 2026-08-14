import { RiAddLine, RiSearchLine } from '@remixicon/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/library/confirm-dialog';
import { FolderForm } from '@/components/library/folder-form';
import {
  type FolderFilter,
  FolderSidebar,
} from '@/components/library/folder-sidebar';
import { PromptForm } from '@/components/library/prompt-form';
import { PromptRow } from '@/components/library/prompt-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEFAULT_PAGE_LIMIT,
  deleteFolderApi,
  deletePromptApi,
  type FolderDto,
  fetchFolders,
  fetchPrompts,
  type PromptDto,
  updateFolderApi,
  updatePromptApi,
} from '@/lib/api';
import type { CueqUser } from '@/lib/storage';

type SharedFilter = 'all' | 'shared' | 'mine';

type ConfirmState =
  | { type: 'folder'; folder: FolderDto }
  | { type: 'prompt'; prompt: PromptDto }
  | null;

type LibraryViewProps = {
  user: CueqUser;
  onSignOut: () => void;
  onUnauthorized: () => void;
};

function promptListParams(
  search: string,
  folderFilter: FolderFilter,
  sharedFilter: SharedFilter,
) {
  return {
    q: search || undefined,
    folderId:
      folderFilter === 'all'
        ? undefined
        : folderFilter === 'none'
          ? null
          : folderFilter,
    shared: sharedFilter === 'all' ? undefined : sharedFilter === 'shared',
  };
}

export function LibraryView({
  user,
  onSignOut,
  onUnauthorized,
}: LibraryViewProps) {
  const currentUserId = user.id;
  const foldersRequestRef = useRef(0);
  const promptsRequestRef = useRef(0);

  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [prompts, setPrompts] = useState<PromptDto[]>([]);
  const [foldersHasMore, setFoldersHasMore] = useState(false);
  const [promptsHasMore, setPromptsHasMore] = useState(false);
  const [loadingFoldersMore, setLoadingFoldersMore] = useState(false);
  const [loadingPromptsMore, setLoadingPromptsMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [sharedFilter, setSharedFilter] = useState<SharedFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [promptFormOpen, setPromptFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptDto | null>(null);
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderDto | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUnauthorized = useCallback(
    (message: string) => {
      if (message === 'Unauthorized') {
        onUnauthorized();
        return true;
      }
      return false;
    },
    [onUnauthorized],
  );

  const loadFolders = useCallback(
    async (offset = 0) => {
      const requestId =
        offset > 0 ? foldersRequestRef.current : ++foldersRequestRef.current;
      try {
        if (offset > 0) setLoadingFoldersMore(true);
        const page = await fetchFolders({
          limit: DEFAULT_PAGE_LIMIT,
          offset,
        });
        if (requestId !== foldersRequestRef.current) return;
        setFolders((prev) =>
          offset > 0 ? [...prev, ...page.folders] : page.folders,
        );
        setFoldersHasMore(page.pagination.hasMore);
      } catch (err) {
        if (requestId !== foldersRequestRef.current) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load folders';
        if (!handleUnauthorized(message)) {
          setError(message);
        }
      } finally {
        if (offset > 0 && requestId === foldersRequestRef.current) {
          setLoadingFoldersMore(false);
        }
      }
    },
    [handleUnauthorized],
  );

  const loadPrompts = useCallback(
    async (offset = 0) => {
      const requestId =
        offset > 0 ? promptsRequestRef.current : ++promptsRequestRef.current;
      try {
        if (offset > 0) setLoadingPromptsMore(true);
        const page = await fetchPrompts({
          ...promptListParams(debouncedSearch, folderFilter, sharedFilter),
          limit: DEFAULT_PAGE_LIMIT,
          offset,
        });
        if (requestId !== promptsRequestRef.current) return;
        setPrompts((prev) =>
          offset > 0 ? [...prev, ...page.prompts] : page.prompts,
        );
        setPromptsHasMore(page.pagination.hasMore);
      } catch (err) {
        if (requestId !== promptsRequestRef.current) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load prompts';
        if (!handleUnauthorized(message)) {
          setError(message);
        }
      } finally {
        if (offset > 0 && requestId === promptsRequestRef.current) {
          setLoadingPromptsMore(false);
        }
      }
    },
    [debouncedSearch, folderFilter, sharedFilter, handleUnauthorized],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([loadFolders(0), loadPrompts(0)]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadFolders, loadPrompts]);

  function openCreatePrompt() {
    setEditingPrompt(null);
    setPromptFormOpen(true);
  }

  function openEditPrompt(prompt: PromptDto) {
    setEditingPrompt(prompt);
    setPromptFormOpen(true);
  }

  function openCreateFolder() {
    setEditingFolder(null);
    setFolderFormOpen(true);
  }

  function openEditFolder(folder: FolderDto) {
    setEditingFolder(folder);
    setFolderFormOpen(true);
  }

  async function handleTogglePromptShare(item: PromptDto) {
    if (item.ownerId !== currentUserId) {
      setError('Only the owner can change sharing');
      return;
    }
    try {
      const updated = await updatePromptApi(item.id, {
        isShared: !item.isShared,
      });
      setPrompts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setStatus(updated.isShared ? 'Prompt shared' : 'Prompt is private');
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      if (!handleUnauthorized(message)) setError(message);
    }
  }

  async function handleToggleFolderShare(folder: FolderDto) {
    if (folder.ownerId !== currentUserId) {
      setError('Only the owner can change sharing');
      return;
    }
    try {
      const updated = await updateFolderApi(folder.id, {
        isShared: !folder.isShared,
      });
      setFolders((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setStatus(updated.isShared ? 'Folder shared' : 'Folder is private');
      setError(null);
      await loadPrompts(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      if (!handleUnauthorized(message)) setError(message);
    }
  }

  async function confirmDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.type === 'folder') {
        const folder = confirm.folder;
        if (folder.ownerId !== currentUserId) {
          setError('Only the owner can delete this folder');
          return;
        }
        await deleteFolderApi(folder.id);
        setStatus('Folder deleted');
        if (folderFilter === folder.id) {
          setFolderFilter('all');
        }
        await Promise.all([loadFolders(0), loadPrompts(0)]);
      } else {
        const item = confirm.prompt;
        if (item.ownerId !== currentUserId) {
          setError('Only the owner can delete this prompt');
          return;
        }
        await deletePromptApi(item.id);
        setStatus('Prompt deleted');
        setPrompts((prev) => prev.filter((p) => p.id !== item.id));
        if (expandedId === item.id) setExpandedId(null);
      }
      setConfirm(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      if (!handleUnauthorized(message)) setError(message);
    } finally {
      setDeleting(false);
    }
  }

  const defaultFolderId =
    folderFilter !== 'all' && folderFilter !== 'none' ? folderFilter : null;

  return (
    <div className="cue-atmosphere relative flex h-full flex-col">
      <LibraryHeader
        user={user}
        onCreatePrompt={openCreatePrompt}
        onSignOut={onSignOut}
      />

      <div className="flex min-h-0 flex-1">
        {loading ? (
          <aside className="flex w-[11.5rem] shrink-0 flex-col gap-2 border-r border-border/70 p-2">
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-4/5 rounded-md" />
          </aside>
        ) : (
          <FolderSidebar
            folders={folders}
            value={folderFilter}
            currentUserId={currentUserId}
            hasMore={foldersHasMore}
            loadingMore={loadingFoldersMore}
            onLoadMore={() => void loadFolders(folders.length)}
            onChange={setFolderFilter}
            onCreate={openCreateFolder}
            onEdit={openEditFolder}
            onShare={(folder) => void handleToggleFolderShare(folder)}
            onDelete={(folder) => setConfirm({ type: 'folder', folder })}
          />
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <SearchToolbar
            search={search}
            sharedFilter={sharedFilter}
            error={error}
            status={status}
            onSearchChange={setSearch}
            onSharedFilterChange={setSharedFilter}
          />
          <PromptList
            loading={loading}
            prompts={prompts}
            expandedId={expandedId}
            currentUserId={currentUserId}
            hasMore={promptsHasMore}
            loadingMore={loadingPromptsMore}
            onCreate={openCreatePrompt}
            onToggle={(id) =>
              setExpandedId((prev) => (prev === id ? null : id))
            }
            onEdit={openEditPrompt}
            onShare={(item) => void handleTogglePromptShare(item)}
            onDelete={(item) => setConfirm({ type: 'prompt', prompt: item })}
            onLoadMore={() => void loadPrompts(prompts.length)}
          />
        </section>
      </div>

      {promptFormOpen ? (
        <PromptForm
          key={editingPrompt?.id ?? 'new'}
          open
          onOpenChange={setPromptFormOpen}
          prompt={editingPrompt}
          folders={folders}
          defaultFolderId={
            editingPrompt ? editingPrompt.folderId : defaultFolderId
          }
          onSaved={async () => {
            setStatus(editingPrompt ? 'Prompt updated' : 'Prompt created');
            await loadPrompts(0);
          }}
        />
      ) : null}

      {folderFormOpen ? (
        <FolderForm
          key={editingFolder?.id ?? 'new'}
          open
          onOpenChange={setFolderFormOpen}
          folder={editingFolder}
          onSaved={async () => {
            setStatus(editingFolder ? 'Folder updated' : 'Folder created');
            await Promise.all([loadFolders(0), loadPrompts(0)]);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.type === 'folder' ? 'Delete folder?' : 'Delete prompt?'
        }
        description={
          confirm?.type === 'folder'
            ? `Delete “${confirm.folder.name}”? Prompts in it become unfoldered.`
            : confirm?.type === 'prompt'
              ? `Delete “${confirm.prompt.title}”?`
              : ''
        }
        confirming={deleting}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function LibraryHeader({
  user,
  onCreatePrompt,
  onSignOut,
}: {
  user: CueqUser;
  onCreatePrompt: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-2 border-b border-border/70 px-3 py-2.5">
      <div className="min-w-0">
        <h1 className="font-heading text-lg font-semibold tracking-tight">
          Cue Q
        </h1>
        <p className="truncate text-xs text-muted-foreground">
          {user.name || user.email}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button size="sm" onClick={onCreatePrompt}>
          <RiAddLine className="size-3.5" />
          New
        </Button>
        <Button size="sm" variant="outline" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}

function SearchToolbar({
  search,
  sharedFilter,
  error,
  status,
  onSearchChange,
  onSharedFilterChange,
}: {
  search: string;
  sharedFilter: SharedFilter;
  error: string | null;
  status: string | null;
  onSearchChange: (value: string) => void;
  onSharedFilterChange: (value: SharedFilter) => void;
}) {
  return (
    <div className="shrink-0 space-y-2 border-b border-border/50 px-3 py-2.5">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search prompts…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select
          value={sharedFilter}
          onChange={(e) => onSharedFilterChange(e.target.value as SharedFilter)}
          className="h-8 w-[7.5rem] shrink-0 text-xs"
          aria-label="Visibility filter"
        >
          <option value="all">All visibility</option>
          <option value="shared">Shared</option>
          <option value="mine">Mine only</option>
        </Select>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : status ? (
        <p className="text-xs text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}

function PromptList({
  loading,
  prompts,
  expandedId,
  currentUserId,
  hasMore,
  loadingMore,
  onCreate,
  onToggle,
  onEdit,
  onShare,
  onDelete,
  onLoadMore,
}: {
  loading: boolean;
  prompts: PromptDto[];
  expandedId: string | null;
  currentUserId: string;
  hasMore: boolean;
  loadingMore: boolean;
  onCreate: () => void;
  onToggle: (id: string) => void;
  onEdit: (prompt: PromptDto) => void;
  onShare: (prompt: PromptDto) => void;
  onDelete: (prompt: PromptDto) => void;
  onLoadMore: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm font-medium">No prompts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a prompt or adjust your filters.
          </p>
          <Button className="mt-4" size="sm" onClick={onCreate}>
            <RiAddLine className="size-3.5" />
            Create prompt
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <ul className="overflow-hidden rounded-xl border border-border/70 bg-card/60 ring-1 ring-foreground/5">
            {prompts.map((item) => (
              <PromptRow
                key={item.id}
                prompt={item}
                expanded={expandedId === item.id}
                isOwner={item.ownerId === currentUserId}
                onToggle={() => onToggle(item.id)}
                onEdit={() => onEdit(item)}
                onShare={() => onShare(item)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </ul>
          {hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={loadingMore}
                onClick={onLoadMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
