import type {} from '@wxt-dev/auto-icons';
import { defineConfig } from 'wxt';

const productionHosts = [
  'https://cue-q.com/*',
  'https://www.cue-q.com/*',
] as const;

const developmentHosts = [
  'http://localhost:3000/*',
  'http://127.0.0.1:3000/*',
  'https://localhost:3000/*',
] as const;

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
  manifest: ({ mode }) => ({
    name: 'Cue Q',
    description:
      'Insert prompts from your Cue Q library into ChatGPT and Claude.',
    homepage_url: 'https://cue-q.com',
    permissions: ['identity', 'storage'],
    host_permissions: [
      ...(mode === 'development' ? developmentHosts : []),
      ...productionHosts,
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
  }),
});
