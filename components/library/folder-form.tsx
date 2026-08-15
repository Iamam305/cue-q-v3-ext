import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { resetSession } from '@/components/providers/query-provider';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createFolderApi,
  type FolderDto,
  updateFolderApi,
} from '@/lib/api';
import { isUnauthorized } from '@/lib/utils';

type FolderFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: FolderDto | null;
  onSaved: () => void;
};

export function FolderForm({
  open,
  onOpenChange,
  folder,
  onSaved,
}: FolderFormProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(folder);
  const [name, setName] = useState(folder?.name ?? '');
  const [isShared, setIsShared] = useState(folder?.isShared ?? false);
  const [error, setError] = useState<string | null>(null);

  const saveFolder = useMutation({
    mutationFn: (input: { name: string; isShared: boolean }) =>
      isEdit && folder
        ? updateFolderApi(folder.id, input)
        : createFolderApi(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['folders'] }),
        queryClient.invalidateQueries({ queryKey: ['prompts'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => {
      if (isUnauthorized(err)) {
        resetSession(queryClient);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to save');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name is required');
      return;
    }

    setError(null);
    saveFolder.mutate({ name: trimmed, isShared });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit folder' : 'New folder'}
      description="Group prompts together. Shared folders appear for the whole team."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="folder-form"
            disabled={saveFolder.isPending}
          >
            {saveFolder.isPending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="folder-form" className="space-y-3" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="folder-name">Name</Label>
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marketing"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
            className="size-3.5 accent-primary"
          />
          Share with team
        </label>
      </form>
    </Dialog>
  );
}
