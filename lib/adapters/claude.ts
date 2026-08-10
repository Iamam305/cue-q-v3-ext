import { insertTextIntoComposer } from '@/lib/adapters/insert';
import type { AIChatAdapter } from '@/lib/adapters/types';

const COMPOSER_SELECTORS = [
  'div[contenteditable="true"].ProseMirror',
  'div.ProseMirror[contenteditable="true"]',
  'fieldset div[contenteditable="true"]',
  'div[contenteditable="true"][data-placeholder]',
  'div[contenteditable="true"][aria-label]',
  'div[contenteditable="true"]',
  'textarea[placeholder*="Message"]',
  'textarea',
];

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** Prefer composers near the bottom of the viewport (chat input). */
function scoreComposer(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  return rect.top + rect.height;
}

export const claudeAdapter: AIChatAdapter = {
  matches() {
    const host = location.hostname;
    return host === 'claude.ai' || host.endsWith('.claude.ai');
  },

  findComposer() {
    const candidates: HTMLElement[] = [];
    for (const selector of COMPOSER_SELECTORS) {
      const nodes = document.querySelectorAll<HTMLElement>(selector);
      for (const node of nodes) {
        if (isVisible(node) && !candidates.includes(node)) {
          candidates.push(node);
        }
      }
      if (candidates.length > 0) break;
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => scoreComposer(b) - scoreComposer(a));
    return candidates[0] ?? null;
  },

  insertText(element, text) {
    insertTextIntoComposer(element, text);
  },
};
