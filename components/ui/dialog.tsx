import type * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  zIndexClassName?: string;
};

function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  zIndexClassName = 'z-50',
}: DialogProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col bg-background',
        zIndexClassName,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
      </div>
      <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-3', className)}>
        {children}
      </div>
      {footer ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/70 px-4 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export { Dialog };
