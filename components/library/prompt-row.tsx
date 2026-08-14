import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFileCopyLine,
  RiShareLine,
} from '@remixicon/react';
import { useState, type MouseEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PromptDto } from '@/lib/api';
import { cn } from '@/lib/utils';

type PromptRowProps = {
  prompt: PromptDto;
  expanded: boolean;
  isOwner: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
};

export function PromptRow({
  prompt,
  expanded,
  isOwner,
  onToggle,
  onEdit,
  onShare,
  onDelete,
}: PromptRowProps) {
  const [copied, setCopied] = useState(false);
  const teamVisible = prompt.isShared || Boolean(prompt.folderIsShared);

  async function handleCopy(event: MouseEvent) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures in restricted contexts
    }
  }

  return (
    <li className="border-b border-border/60 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'w-full cursor-pointer px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
          expanded && 'bg-muted/30',
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-medium">{prompt.title}</h3>
              {teamVisible ? (
                <Badge variant="secondary">Team</Badge>
              ) : (
                <Badge variant="outline">Private</Badge>
              )}
              {prompt.folderName ? (
                <span className="text-xs text-muted-foreground">
                  in {prompt.folderName}
                </span>
              ) : null}
            </div>
          </div>
          <span className="mt-0.5 text-muted-foreground">
            {expanded ? (
              <RiArrowUpSLine className="size-4" />
            ) : (
              <RiArrowDownSLine className="size-4" />
            )}
          </span>
        </div>

        <RowActions
          copied={copied}
          isOwner={isOwner}
          isShared={prompt.isShared}
          onCopy={(e) => void handleCopy(e)}
          onEdit={onEdit}
          onShare={onShare}
          onDelete={onDelete}
        />

        {expanded ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {prompt.content}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function RowActions({
  copied,
  isOwner,
  isShared,
  onCopy,
  onEdit,
  onShare,
  onDelete,
}: {
  copied: boolean;
  isOwner: boolean;
  isShared: boolean;
  onCopy: (event: MouseEvent) => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  function stop(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1" onClick={stop}>
      <Button
        size="xs"
        variant={copied ? 'secondary' : 'default'}
        onClick={onCopy}
        aria-label="Copy prompt"
      >
        {copied ? (
          <RiCheckLine className="size-3.5" />
        ) : (
          <RiFileCopyLine className="size-3.5" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      {isOwner ? (
        <>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Edit prompt"
            onClick={(e) => {
              stop(e);
              onEdit();
            }}
          >
            <RiEditLine className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={isShared ? 'Make private' : 'Share prompt'}
            onClick={(e) => {
              stop(e);
              onShare();
            }}
          >
            <RiShareLine className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Delete prompt"
            onClick={(e) => {
              stop(e);
              onDelete();
            }}
          >
            <RiDeleteBinLine className="size-3.5" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
