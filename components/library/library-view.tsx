import { RiAddLine, RiSearchLine } from '@remixicon/react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
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
  type MeBilling,
  type PromptDto,
  updateFolderApi,
  updatePromptApi,
} from '@/lib/api';
import type { CueqUser } from '@/lib/storage';
import { isUnauthorized } from '@/lib/utils';

type SharedFilter = 'all' | 'shared' | 'mine';

type ConfirmState =
  | { type: 'folder'; folder: FolderDto }
  | { type: 'prompt'; prompt: PromptDto }
  | null;

type LibraryViewProps = {
  user: CueqUser;
  billing: MeBilling | null;
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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function LibraryView({
  user,
  billing,
  onSignOut,
  onUnauthorized,
}: LibraryViewProps) {
  const queryClient = useQueryClient();
  const currentUserId = user.id;

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const foldersQuery = useInfiniteQuery({
    queryKey: ['folders'],
    queryFn: ({ pageParam }) =>
      fetchFolders({ limit: DEFAULT_PAGE_LIMIT, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.offset + lastPage.pagination.limit
        : undefined,
  });

  const promptsQuery = useInfiniteQuery({
    queryKey: ['prompts', { q: debouncedSearch, folderFilter, sharedFilter }],
    queryFn: ({ pageParam }) =>
      fetchPrompts({
        ...promptListParams(debouncedSearch, folderFilter, sharedFilter),
        limit: DEFAULT_PAGE_LIMIT,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.offset + lastPage.pagination.limit
        : undefined,
    placeholderData: keepPreviousData,
  });

  const folders = useMemo(
    () => foldersQuery.data?.pages.flatMap((page) => page.folders) ?? [],
    [foldersQuery.data],
  );
  const prompts = useMemo(
    () => promptsQuery.data?.pages.flatMap((page) => page.prompts) ?? [],
    [promptsQuery.data],
  );

  useEffect(() => {
    const queryError = foldersQuery.error ?? promptsQuery.error;
    if (isUnauthorized(queryError)) {
      onUnauthorized();
    }
  }, [foldersQuery.error, promptsQuery.error, onUnauthorized]);

  const handleMutationError = (err: unknown, fallback: string) => {
    if (isUnauthorized(err)) {
      onUnauthorized();
      return;
    }
    setError(errorMessage(err, fallback));
  };

  const updatePromptShare = useMutation({
    mutationFn: (item: PromptDto) =>
      updatePromptApi(item.id, { isShared: !item.isShared }),
    onSuccess: async (updated) => {
      setStatus(updated.isShared ? 'Prompt shared' : 'Prompt is private');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
    onError: (err) => handleMutationError(err, 'Update failed'),
  });

  const updateFolderShare = useMutation({
    mutationFn: (folder: FolderDto) =>
      updateFolderApi(folder.id, { isShared: !folder.isShared }),
    onSuccess: async (updated) => {
      setStatus(updated.isShared ? 'Folder shared' : 'Folder is private');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['folders'] }),
        queryClient.invalidateQueries({ queryKey: ['prompts'] }),
      ]);
    },
    onError: (err) => handleMutationError(err, 'Update failed'),
  });

  const deleteFolder = useMutation({
    mutationFn: (folder: FolderDto) => deleteFolderApi(folder.id),
    onSuccess: async (_data, folder) => {
      setStatus('Folder deleted');
      setConfirm(null);
      setError(null);
      setFolderFilter((prev) => (prev === folder.id ? 'all' : prev));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['folders'] }),
        queryClient.invalidateQueries({ queryKey: ['prompts'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
    },
    onError: (err) => handleMutationError(err, 'Delete failed'),
  });

  const deletePrompt = useMutation({
    mutationFn: (item: PromptDto) => deletePromptApi(item.id),
    onSuccess: async (_data, item) => {
      setStatus('Prompt deleted');
      setConfirm(null);
      setError(null);
      setExpandedId((prev) => (prev === item.id ? null : prev));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['prompts'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
    },
    onError: (err) => handleMutationError(err, 'Delete failed'),
  });

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

  function handleTogglePromptShare(item: PromptDto) {
    if (item.ownerId !== currentUserId) {
      setError('Only the owner can change sharing');
      return;
    }
    updatePromptShare.mutate(item);
  }

  function handleToggleFolderShare(folder: FolderDto) {
    if (folder.ownerId !== currentUserId) {
      setError('Only the owner can change sharing');
      return;
    }
    updateFolderShare.mutate(folder);
  }

  function confirmDelete() {
    if (!confirm) return;
    if (confirm.type === 'folder') {
      const folder = confirm.folder;
      if (folder.ownerId !== currentUserId) {
        setError('Only the owner can delete this folder');
        return;
      }
      deleteFolder.mutate(folder);
      return;
    }
    const item = confirm.prompt;
    if (item.ownerId !== currentUserId) {
      setError('Only the owner can delete this prompt');
      return;
    }
    deletePrompt.mutate(item);
  }

  const foldersLoading = foldersQuery.isPending && !foldersQuery.data;
  const promptsLoading = promptsQuery.isPending && !promptsQuery.data;
  const queryError = foldersQuery.error ?? promptsQuery.error;
  const displayError = isUnauthorized(queryError)
    ? error
    : (error ??
      (queryError ? errorMessage(queryError, 'Failed to load') : null));
  const defaultFolderId =
    folderFilter !== 'all' && folderFilter !== 'none' ? folderFilter : null;

  return (
    <div className="cue-atmosphere relative flex h-full flex-col">
      <LibraryHeader
        user={user}
        billing={billing}
        onCreatePrompt={openCreatePrompt}
        onSignOut={onSignOut}
      />

      <div className="flex min-h-0 flex-1">
        {foldersLoading ? (
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
            hasMore={Boolean(foldersQuery.hasNextPage)}
            loadingMore={foldersQuery.isFetchingNextPage}
            onLoadMore={() => void foldersQuery.fetchNextPage()}
            onChange={setFolderFilter}
            onCreate={openCreateFolder}
            onEdit={openEditFolder}
            onShare={handleToggleFolderShare}
            onDelete={(folder) => setConfirm({ type: 'folder', folder })}
          />
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <SearchToolbar
            search={search}
            sharedFilter={sharedFilter}
            error={displayError}
            status={status}
            onSearchChange={setSearch}
            onSharedFilterChange={setSharedFilter}
          />
          <PromptList
            loading={promptsLoading}
            prompts={prompts}
            expandedId={expandedId}
            currentUserId={currentUserId}
            hasMore={Boolean(promptsQuery.hasNextPage)}
            loadingMore={promptsQuery.isFetchingNextPage}
            onCreate={openCreatePrompt}
            onToggle={(id) =>
              setExpandedId((prev) => (prev === id ? null : id))
            }
            onEdit={openEditPrompt}
            onShare={handleTogglePromptShare}
            onDelete={(item) => setConfirm({ type: 'prompt', prompt: item })}
            onLoadMore={() => void promptsQuery.fetchNextPage()}
          />
        </section>
      </div>

      {promptFormOpen ? (
        <PromptForm
          key={editingPrompt?.id ?? 'new'}
          open
          onOpenChange={setPromptFormOpen}
          prompt={editingPrompt}
          defaultFolderId={
            editingPrompt ? editingPrompt.folderId : defaultFolderId
          }
          onSaved={() => {
            setStatus(editingPrompt ? 'Prompt updated' : 'Prompt created');
          }}
        />
      ) : null}

      {folderFormOpen ? (
        <FolderForm
          key={editingFolder?.id ?? 'new'}
          open
          onOpenChange={setFolderFormOpen}
          folder={editingFolder}
          onSaved={() => {
            setStatus(editingFolder ? 'Folder updated' : 'Folder created');
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
        confirming={deleteFolder.isPending || deletePrompt.isPending}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function LibraryHeader({
  user,
  billing,
  onCreatePrompt,
  onSignOut,
}: {
  user: CueqUser;
  billing: MeBilling | null;
  onCreatePrompt: () => void;
  onSignOut: () => void;
}) {
  const quota =
    billing && billing.plan === 'free'
      ? `${billing.usage.prompts.used}/${billing.usage.prompts.limit} prompts · ${billing.usage.folders.used}/${billing.usage.folders.limit} folders`
      : billing?.plan === 'pro'
        ? 'Pro · unlimited library'
        : null;

  return (
    <header className="flex shrink-0 items-start justify-between gap-2 border-b border-border/70 px-3 py-2.5">
      <div className="min-w-0">
        <h1 className="font-heading flex items-center gap-2 text-lg font-semibold tracking-tight">
          <BrandMark className="size-5" />
          Cue Q
        </h1>
        <p className="truncate text-xs text-muted-foreground">
          {quota ?? (user.name || user.email)}
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
