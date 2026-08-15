import noto400 from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2?inline';
import noto500 from '@fontsource/noto-sans/files/noto-sans-latin-500-normal.woff2?inline';
import noto600 from '@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff2?inline';
import noto700 from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2?inline';

const STYLE_ID = 'cueq-noto-sans';

const FACES = [
  { weight: 400, dataUrl: noto400 },
  { weight: 500, dataUrl: noto500 },
  { weight: 600, dataUrl: noto600 },
  { weight: 700, dataUrl: noto700 },
] as const;

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Register Noto Sans inside the shadow root.
 * Fonts are inlined so ChatGPT/Claude CSP cannot block a chrome-extension fetch.
 * A style tag is appended after WXT CSS so @font-face is not hoisted onto the page.
 */
export async function injectNotoSansFonts(shadow: ShadowRoot): Promise<void> {
  if (shadow.getElementById(STYLE_ID)) return;

  const rules = await Promise.all(
    FACES.map(async ({ weight, dataUrl }) => {
      const font = new FontFace('Noto Sans', dataUrlToArrayBuffer(dataUrl), {
        style: 'normal',
        weight: String(weight),
      });
      await font.load();
      document.fonts.add(font);
      (shadow as ShadowRoot & { fonts: FontFaceSet }).fonts.add(font);
      return `@font-face {
  font-family: 'Noto Sans';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  src: url(${JSON.stringify(dataUrl)}) format('woff2');
}`;
    }),
  );

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = rules.join('\n');
  shadow.appendChild(style);
}
