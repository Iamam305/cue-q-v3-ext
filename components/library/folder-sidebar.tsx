import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFolderLine,
  RiFolderSharedLine,
  RiShareLine,
} from '@remixicon/react';
import { Button } from '@/components/ui/button';
import type { FolderDto } from '@/lib/api';
import { cn } from '@/lib/utils';

export type FolderFilter = 'all' | 'none' | string;

type FolderSidebarProps = {
  folders: FolderDto[];
  value: FolderFilter;
  currentUserId: string;
  onChange: (next: FolderFilter) => void;
  onCreate: () => void;
  onEdit: (folder: FolderDto) => void;
  onShare: (folder: FolderDto) => void;
  onDelete: (folder: FolderDto) => void;
};

export function FolderSidebar({
  folders,
  value,
  currentUserId,
  onChange,
  onCreate,
  onEdit,
  onShare,
  onDelete,
}: FolderSidebarProps) {
  return (
    <aside className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-border/70 bg-sidebar/40">
      <div className="flex items-center justify-between gap-1 border-b border-border/60 px-2.5 py-2">
        <h2 className="text-xs font-medium">Folders</h2>
        <Button size="xs" variant="outline" onClick={onCreate}>
          <RiAddLine className="size-3.5" />
          New
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
        <button
          type="button"
          onClick={() => onChange('all')}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/70',
            value === 'all' && 'bg-muted font-medium',
          )}
        >
          All prompts
        </button>
        <button
          type="button"
          onClick={() => onChange('none')}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/70',
            value === 'none' && 'bg-muted font-medium',
          )}
        >
          Unfoldered
        </button>

        {folders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 px-2 py-4 text-center">
            <p className="text-[11px] text-muted-foreground">No folders yet</p>
            <Button
              size="xs"
              variant="outline"
              className="mt-2"
              onClick={onCreate}
            >
              <RiAddLine className="size-3.5" />
              New folder
            </Button>
          </div>
        ) : (
          folders.map((folder) => {
            const isOwner = folder.ownerId === currentUserId;
            const active = value === folder.id;
            return (
              <div
                key={folder.id}
                className={cn(
                  'group flex items-center gap-0.5 rounded-md px-0.5 py-0.5',
                  active && 'bg-muted',
                )}
              >
                <button
                  type="button"
                  onClick={() => onChange(folder.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-xs hover:bg-muted/60"
                >
                  {folder.isShared ? (
                    <RiFolderSharedLine className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <RiFolderLine className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </button>
                {isOwner ? (
                  <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="size-6"
                      aria-label={
                        folder.isShared ? 'Make private' : 'Share folder'
                      }
                      onClick={() => onShare(folder)}
                    >
                      <RiShareLine className="size-3" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="size-6"
                      aria-label="Edit folder"
                      onClick={() => onEdit(folder)}
                    >
                      <RiEditLine className="size-3" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="size-6"
                      aria-label="Delete folder"
                      onClick={() => onDelete(folder)}
                    >
                      <RiDeleteBinLine className="size-3" />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
