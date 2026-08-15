import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { resetSession } from '@/components/providers/query-provider';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createPromptApi,
  fetchAllFolders,
  type PromptDto,
  updatePromptApi,
} from '@/lib/api';
import { isUnauthorized } from '@/lib/utils';

const NONE_FOLDER = '__none__';

type PromptFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt?: PromptDto | null;
  defaultFolderId?: string | null;
  onSaved: () => void;
};

export function PromptForm({
  open,
  onOpenChange,
  prompt,
  defaultFolderId,
  onSaved,
}: PromptFormProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(prompt);
  const [title, setTitle] = useState(prompt?.title ?? '');
  const [content, setContent] = useState(prompt?.content ?? '');
  const [folderId, setFolderId] = useState(
    prompt ? (prompt.folderId ?? NONE_FOLDER) : (defaultFolderId ?? NONE_FOLDER),
  );
  const [isShared, setIsShared] = useState(prompt?.isShared ?? false);
  const [error, setError] = useState<string | null>(null);

  const foldersQuery = useQuery({
    queryKey: ['folders', 'all'],
    queryFn: () => fetchAllFolders(),
  });
  const folders = foldersQuery.data ?? [];

  const savePrompt = useMutation({
    mutationFn: (input: {
      title: string;
      content: string;
      folderId: string | null;
      isShared: boolean;
    }) =>
      isEdit && prompt
        ? updatePromptApi(prompt.id, input)
        : createPromptApi(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
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
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }
    if (!content.trim()) {
      setError('Prompt content is required');
      return;
    }

    setError(null);
    savePrompt.mutate({
      title: trimmedTitle,
      content,
      folderId: folderId === NONE_FOLDER ? null : folderId,
      isShared,
    });
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
            disabled={savePrompt.isPending}
          >
            {savePrompt.isPending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="prompt-form" className="space-y-3" onSubmit={handleSubmit}>
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
