import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from '@/components/providers/query-provider';
import { PromptPalette } from '@/components/quick-search/prompt-palette';
import { injectNotoSansFonts } from '@/lib/inject-fonts';
import '@/assets/content.css';

function QuickSearchApp() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isAltI =
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.code === 'KeyI' || event.key === 'i' || event.key === 'I');

      if (isAltI) {
        event.preventDefault();
        event.stopPropagation();
        toggle();
        return;
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [toggle, close, open]);

  return <PromptPalette open={open} onClose={close} />;
}

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
  ],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'cueq-quick-search',
      position: 'overlay',
      zIndex: 2147483646,
      onMount(container) {
        const app = document.createElement('div');
        app.id = 'cueq-quick-search-root';
        container.append(app);
        const root = ReactDOM.createRoot(app);
        root.render(
          <React.StrictMode>
            <QueryProvider>
              <QuickSearchApp />
            </QueryProvider>
          </React.StrictMode>,
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    try {
      await injectNotoSansFonts(ui.shadow);
    } catch {
      // Overlay still mounts with system fallbacks if a font fails to load.
    }
    ui.uiContainer.style.fontFamily =
      '"Noto Sans", ui-sans-serif, system-ui, sans-serif';
    ui.mount();
  },
});
