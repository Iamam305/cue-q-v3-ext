import { insertTextIntoComposer } from '@/lib/adapters/insert';
import type { AIChatAdapter } from '@/lib/adapters/types';

const COMPOSER_SELECTORS = [
  '#prompt-textarea',
  'div[contenteditable="true"]#prompt-textarea',
  'div.ProseMirror[contenteditable="true"]',
  'form textarea[name="prompt-textarea"]',
  'form div[contenteditable="true"]',
  'main div[contenteditable="true"][data-placeholder]',
  'main textarea',
];

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export const chatgptAdapter: AIChatAdapter = {
  matches() {
    const host = location.hostname;
    return (
      host === 'chatgpt.com' ||
      host.endsWith('.chatgpt.com') ||
      host === 'chat.openai.com' ||
      host.endsWith('.chat.openai.com')
    );
  },

  findComposer() {
    for (const selector of COMPOSER_SELECTORS) {
      const nodes = document.querySelectorAll<HTMLElement>(selector);
      for (const node of nodes) {
        if (isVisible(node)) return node;
      }
    }
    return null;
  },

  insertText(element, text) {
    insertTextIntoComposer(element, text);
  },
};
