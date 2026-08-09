import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createFolderApi,
  type FolderDto,
  updateFolderApi,
} from '@/lib/api';

type FolderFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: FolderDto | null;
  onSaved: (folder: FolderDto) => void;
};

export function FolderForm({
  open,
  onOpenChange,
  folder,
  onSaved,
}: FolderFormProps) {
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(folder);

  useEffect(() => {
    if (open) {
      setName(folder?.name ?? '');
      setIsShared(folder?.isShared ?? false);
      setError(null);
    }
  }, [open, folder]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name is required');
      return;
    }

    setPending(true);
    setError(null);
    try {
      const saved =
        isEdit && folder
          ? await updateFolderApi(folder.id, { name: trimmed, isShared })
          : await createFolderApi({ name: trimmed, isShared });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setPending(false);
    }
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
          <Button type="submit" form="folder-form" disabled={pending}>
            {pending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id="folder-form"
        className="space-y-3"
        onSubmit={(e) => void handleSubmit(e)}
      >
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
