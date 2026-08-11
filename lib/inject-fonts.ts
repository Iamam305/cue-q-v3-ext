const STYLE_ID = 'cueq-noto-sans';
const FONT_WEIGHTS = [400, 500, 600, 700] as const;

/** Register Noto Sans on the light DOM so Shadow UI can use the family. */
export function injectNotoSansFonts(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = FONT_WEIGHTS.map(
    (weight) => `@font-face {
  font-family: 'Noto Sans';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  src: url('${browser.runtime.getURL(`/fonts/noto-sans-latin-${weight}-normal.woff2`)}') format('woff2');
}`,
  ).join('\n');

  document.head.appendChild(style);
}
