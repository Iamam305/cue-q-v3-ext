import type {} from '@wxt-dev/auto-icons';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
  },
  // Keep clear of Next.js (cue-q) on :3000 — otherwise localhost auth hits WXT and 404s.
  dev: {
    server: {
      port: 3100,
    },
  },
  manifest: {
    name: 'Cue Q',
    description: 'Access your Cue Q prompt library from ChatGPT and Claude.',
    permissions: ['identity', 'storage'],
    host_permissions: [
      'http://localhost:3000/*',
      'http://127.0.0.1:3000/*',
      'https://localhost:3000/*',
      'https://cue-q.com/*',
    ],
    web_accessible_resources: [
      {
        resources: ['fonts/*.woff2'],
        matches: [
          '*://chatgpt.com/*',
          '*://chat.openai.com/*',
          '*://claude.ai/*',
        ],
      },
    ],
  },
});
