import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createPromptApi,
  type FolderDto,
  type PromptDto,
  updatePromptApi,
} from '@/lib/api';

const NONE_FOLDER = '__none__';

type PromptFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt?: PromptDto | null;
  folders: FolderDto[];
  defaultFolderId?: string | null;
  onSaved: (prompt: PromptDto) => void;
};

export function PromptForm({
  open,
  onOpenChange,
  prompt,
  folders,
  defaultFolderId,
  onSaved,
}: PromptFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState(NONE_FOLDER);
  const [isShared, setIsShared] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(prompt);

  useEffect(() => {
    if (open) {
      setTitle(prompt?.title ?? '');
      setContent(prompt?.content ?? '');
      setFolderId(prompt?.folderId ?? defaultFolderId ?? NONE_FOLDER);
      setIsShared(prompt?.isShared ?? false);
      setError(null);
    }
  }, [open, prompt, defaultFolderId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }
    if (!content.trim()) {
      setError('Prompt content is required');
      return;
    }

    const resolvedFolderId = folderId === NONE_FOLDER ? null : folderId;
    setPending(true);
    setError(null);
    try {
      const saved =
        isEdit && prompt
          ? await updatePromptApi(prompt.id, {
              title: trimmedTitle,
              content,
              folderId: resolvedFolderId,
              isShared,
            })
          : await createPromptApi({
              title: trimmedTitle,
              content,
              folderId: resolvedFolderId,
              isShared,
            });
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
      title={isEdit ? 'Edit prompt' : 'New prompt'}
      description="Save reusable prompt text. You can share it with your team."
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
            form="prompt-form"
            disabled={pending}
          >
            {pending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="prompt-form" className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="prompt-title">Title</Label>
          <Input
            id="prompt-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Blog outline"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prompt-content">Content</Label>
          <Textarea
            id="prompt-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your prompt…"
            rows={8}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prompt-folder">Folder</Label>
          <Select
            id="prompt-folder"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value={NONE_FOLDER}>No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
                {folder.isShared ? ' (shared)' : ''}
              </option>
            ))}
          </Select>
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
