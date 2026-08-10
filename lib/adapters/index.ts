import { chatgptAdapter } from '@/lib/adapters/chatgpt';
import { claudeAdapter } from '@/lib/adapters/claude';
import type { AIChatAdapter } from '@/lib/adapters/types';

export type { AIChatAdapter } from '@/lib/adapters/types';

const adapters: AIChatAdapter[] = [chatgptAdapter, claudeAdapter];

export function getActiveAdapter(): AIChatAdapter | null {
  return adapters.find((adapter) => adapter.matches()) ?? null;
}
