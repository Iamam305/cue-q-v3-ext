import { RiAddLine, RiSearchLine } from '@remixicon/react';
import { useCallback, useEffect, useState } from 'react';
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

export function LibraryView({
  user,
  onSignOut,
  onUnauthorized,
}: LibraryViewProps) {
  const currentUserId = user.id;
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
    async (opts?: { append?: boolean }) => {
      const append = opts?.append ?? false;
      try {
        if (append) setLoadingFoldersMore(true);
        const offset = append ? folders.length : 0;
        const page = await fetchFolders({
          limit: DEFAULT_PAGE_LIMIT,
          offset,
        });
        setFolders((prev) =>
          append ? [...prev, ...page.folders] : page.folders,
        );
        setFoldersHasMore(page.pagination.hasMore);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load folders';
        if (!handleUnauthorized(message)) {
          setError(message);
        }
      } finally {
        if (append) setLoadingFoldersMore(false);
      }
    },
    [folders.length, handleUnauthorized],
  );

  const loadPrompts = useCallback(
    async (opts?: { append?: boolean }) => {
      const append = opts?.append ?? false;
      try {
        if (append) setLoadingPromptsMore(true);
        const folderId =
          folderFilter === 'all'
            ? undefined
            : folderFilter === 'none'
              ? null
              : folderFilter;

        const shared =
          sharedFilter === 'all' ? undefined : sharedFilter === 'shared';

        const offset = append ? prompts.length : 0;
        const page = await fetchPrompts({
          q: debouncedSearch || undefined,
          folderId,
          shared,
          limit: DEFAULT_PAGE_LIMIT,
          offset,
        });
        setPrompts((prev) =>
          append ? [...prev, ...page.prompts] : page.prompts,
        );
        setPromptsHasMore(page.pagination.hasMore);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load prompts';
        if (!handleUnauthorized(message)) {
          setError(message);
        }
      } finally {
        if (append) setLoadingPromptsMore(false);
      }
    },
    [
      debouncedSearch,
      folderFilter,
      sharedFilter,
      prompts.length,
      handleUnauthorized,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const folderId =
          folderFilter === 'all'
            ? undefined
            : folderFilter === 'none'
              ? null
              : folderFilter;
        const shared =
          sharedFilter === 'all' ? undefined : sharedFilter === 'shared';

        const [folderPage, promptPage] = await Promise.all([
          fetchFolders({ limit: DEFAULT_PAGE_LIMIT, offset: 0 }),
          fetchPrompts({
            q: debouncedSearch || undefined,
            folderId,
            shared,
            limit: DEFAULT_PAGE_LIMIT,
            offset: 0,
          }),
        ]);
        if (cancelled) return;
        setFolders(folderPage.folders);
        setFoldersHasMore(folderPage.pagination.hasMore);
        setPrompts(promptPage.prompts);
        setPromptsHasMore(promptPage.pagination.hasMore);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load library';
        if (!handleUnauthorized(message)) {
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, folderFilter, sharedFilter, handleUnauthorized]);

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
      await loadPrompts();
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
        await Promise.all([loadFolders(), loadPrompts()]);
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
          <Button size="sm" onClick={openCreatePrompt}>
            <RiAddLine className="size-3.5" />
            New
          </Button>
          <Button size="sm" variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </header>

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
            onLoadMore={() => void loadFolders({ append: true })}
            onChange={setFolderFilter}
            onCreate={openCreateFolder}
            onEdit={openEditFolder}
            onShare={(folder) => void handleToggleFolderShare(folder)}
            onDelete={(folder) => setConfirm({ type: 'folder', folder })}
          />
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 space-y-2 border-b border-border/50 px-3 py-2.5">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search prompts…"
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Select
                value={sharedFilter}
                onChange={(e) =>
                  setSharedFilter(e.target.value as SharedFilter)
                }
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
                <Button className="mt-4" size="sm" onClick={openCreatePrompt}>
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
                      onToggle={() =>
                        setExpandedId((prev) =>
                          prev === item.id ? null : item.id,
                        )
                      }
                      onEdit={() => openEditPrompt(item)}
                      onShare={() => void handleTogglePromptShare(item)}
                      onDelete={() =>
                        setConfirm({ type: 'prompt', prompt: item })
                      }
                    />
                  ))}
                </ul>
                {promptsHasMore ? (
                  <div className="flex justify-center pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingPromptsMore}
                      onClick={() => void loadPrompts({ append: true })}
                    >
                      {loadingPromptsMore ? 'Loading…' : 'Load more'}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>

      <PromptForm
        open={promptFormOpen}
        onOpenChange={setPromptFormOpen}
        prompt={editingPrompt}
        folders={folders}
        defaultFolderId={
          editingPrompt ? editingPrompt.folderId : defaultFolderId
        }
        onSaved={async () => {
          setStatus(editingPrompt ? 'Prompt updated' : 'Prompt created');
          await loadPrompts();
        }}
      />

      <FolderForm
        open={folderFormOpen}
        onOpenChange={setFolderFormOpen}
        folder={editingFolder}
        onSaved={async () => {
          setStatus(editingFolder ? 'Folder updated' : 'Folder created');
          await Promise.all([loadFolders(), loadPrompts()]);
        }}
      />

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
