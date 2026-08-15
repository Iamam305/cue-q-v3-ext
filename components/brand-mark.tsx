import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 156 156"
      className={cn('size-6 shrink-0', className)}
      aria-hidden
    >
      <title>Cue Q</title>
      <rect
        x="16"
        y="16"
        width="120"
        height="120"
        rx="27"
        fill="none"
        stroke="currentColor"
        strokeWidth="24"
      />
      <rect x="114" y="114" width="38" height="38" rx="8" fill="currentColor" />
    </svg>
  );
}
