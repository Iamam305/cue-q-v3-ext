/**
 * Renders Chrome Web Store PNGs (24-bit, no alpha) at exact dashboard sizes.
 * Run from cueq-ext: node store/generate-assets.mjs
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'assets');

const ink = '#2A3238';
const muted = '#6B7780';
const primary = '#3D7A92';
const bg = '#F3F6F8';
const card = '#FFFFFF';
const line = '#E4EAED';
const wash = '#E8F1F4';
const font = "Arial, Helvetica, sans-serif";

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function mark(x, y, size, color = ink) {
  const s = size / 156;
  return `
    <g transform="translate(${x} ${y}) scale(${s})">
      <rect x="16" y="16" width="120" height="120" rx="27" fill="none" stroke="${color}" stroke-width="24"/>
      <rect x="114" y="114" width="38" height="38" rx="8" fill="${color}"/>
    </g>`;
}

function chromeBar(width) {
  return `
    <rect width="${width}" height="52" fill="#FFFFFF" stroke="${line}"/>
    <circle cx="28" cy="26" r="6" fill="#E8B4B4"/>
    <circle cx="48" cy="26" r="6" fill="#E2D4A8"/>
    <circle cx="68" cy="26" r="6" fill="#B7D4C0"/>
    <rect x="96" y="14" width="${width - 200}" height="24" rx="12" fill="${bg}"/>
    <text x="112" y="31" font-family="${font}" font-size="12" fill="${muted}">chatgpt.com</text>
    ${mark(width - 44, 10, 32, ink)}`;
}

function atmosphere(width, height) {
  return `
    <rect width="${width}" height="${height}" fill="${bg}"/>
    <defs>
      <radialGradient id="glow" cx="50%" cy="0%" r="70%">
        <stop offset="0%" stop-color="${primary}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${primary}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#glow)"/>`;
}

function caption(width, height, text) {
  return `
    <text x="${width / 2}" y="${height - 28}" text-anchor="middle"
      font-family="${font}" font-size="18" font-weight="600" fill="${ink}">${esc(text)}</text>`;
}

function popupShell(x, y, w, h, titleRight = '') {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${card}" stroke="${line}"/>
    <rect x="${x}" y="${y}" width="${w}" height="56" rx="16" fill="${card}"/>
    <rect x="${x}" y="${y + 40}" width="${w}" height="16" fill="${card}"/>
    ${mark(x + 16, y + 12, 32, ink)}
    <text x="${x + 52}" y="${y + 35}" font-family="${font}" font-size="18" font-weight="700" fill="${ink}">Cue Q</text>
    ${titleRight}`;
}

function signInPopup() {
  const x = 360;
  const y = 140;
  const w = 560;
  const h = 480;
  return `
    ${popupShell(x, y, w, h)}
    <text x="${x + w / 2}" y="${y + 200}" text-anchor="middle" font-family="${font}" font-size="28" font-weight="700" fill="${ink}">Cue Q</text>
    ${mark(x + w / 2 - 18, y + 130, 36, ink)}
    <text x="${x + w / 2}" y="${y + 232}" text-anchor="middle" font-family="${font}" font-size="14" fill="${muted}">Sign in to access your prompt library.</text>
    <rect x="${x + 150}" y="${y + 270}" width="260" height="40" rx="8" fill="${primary}"/>
    <text x="${x + w / 2}" y="${y + 296}" text-anchor="middle" font-family="${font}" font-size="14" font-weight="600" fill="#FFFFFF">Sign in</text>`;
}

function libraryPopup({ folder = 'All prompts', search = 'Search prompts…', rows, highlight = 0 }) {
  const x = 200;
  const y = 90;
  const w = 880;
  const h = 620;
  const sidebar = 200;
  const folders = ['All prompts', 'Onboarding', 'Support', 'Writing'];
  const folderRects = folders
    .map((name, i) => {
      const fy = y + 78 + i * 44;
      const active = name === folder;
      return `
        <rect x="${x + 12}" y="${fy}" width="${sidebar - 24}" height="36" rx="8"
          fill="${active ? wash : 'transparent'}"/>
        <text x="${x + 28}" y="${fy + 24}" font-family="${font}" font-size="13"
          font-weight="${active ? '600' : '400'}" fill="${active ? primary : ink}">${esc(name)}</text>`;
    })
    .join('');

  const promptRows = rows
    .map((row, i) => {
      const py = y + 150 + i * 92;
      const active = i === highlight;
      return `
        <rect x="${x + sidebar + 16}" y="${py}" width="${w - sidebar - 32}" height="80" rx="10"
          fill="${active ? wash : card}" stroke="${line}"/>
        <text x="${x + sidebar + 36}" y="${py + 28}" font-family="${font}" font-size="15" font-weight="600" fill="${ink}">${esc(row.title)}</text>
        <text x="${x + sidebar + 36}" y="${py + 52}" font-family="${font}" font-size="12" fill="${muted}">${esc(row.body)}</text>
        <rect x="${x + w - 96}" y="${py + 18}" width="52" height="22" rx="6" fill="${row.shared ? wash : bg}"/>
        <text x="${x + w - 70}" y="${py + 34}" text-anchor="middle" font-family="${font}" font-size="10" fill="${row.shared ? primary : muted}">${row.shared ? 'Team' : 'Private'}</text>`;
    })
    .join('');

  return `
    ${popupShell(
      x,
      y,
      w,
      h,
      `<text x="${x + w - 24}" y="${y + 34}" text-anchor="end" font-family="${font}" font-size="12" fill="${muted}">Alex · Sign out</text>
       <rect x="${x + w - 118}" y="${y + 16}" width="72" height="28" rx="6" fill="${primary}"/>
       <text x="${x + w - 82}" y="${y + 35}" text-anchor="middle" font-family="${font}" font-size="12" fill="#FFFFFF">New</text>`,
    )}
    <line x1="${x + sidebar}" y1="${y + 56}" x2="${x + sidebar}" y2="${y + h}" stroke="${line}"/>
    <text x="${x + 28}" y="${y + 84}" font-family="${font}" font-size="11" fill="${muted}">FOLDERS</text>
    ${folderRects}
    <rect x="${x + sidebar + 16}" y="${y + 72}" width="${w - sidebar - 160}" height="36" rx="8" fill="${bg}" stroke="${line}"/>
    <text x="${x + sidebar + 32}" y="${y + 95}" font-family="${font}" font-size="13" fill="${muted}">${esc(search)}</text>
    <rect x="${x + w - 128}" y="${y + 72}" width="96" height="36" rx="8" fill="${bg}" stroke="${line}"/>
    <text x="${x + w - 80}" y="${y + 95}" text-anchor="middle" font-family="${font}" font-size="12" fill="${ink}">All</text>
    ${promptRows}`;
}

function chatCanvas(width, height, { inserted = '' } = {}) {
  return `
    <rect x="0" y="52" width="220" height="${height - 52}" fill="#FAFBFC" stroke="${line}"/>
    <text x="24" y="92" font-family="${font}" font-size="13" font-weight="700" fill="${ink}">ChatGPT</text>
    <rect x="16" y="112" width="188" height="32" rx="8" fill="${wash}"/>
    <text x="28" y="133" font-family="${font}" font-size="12" fill="${primary}">New chat</text>
    <text x="28" y="176" font-family="${font}" font-size="12" fill="${muted}">Onboarding email</text>
    <text x="28" y="204" font-family="${font}" font-size="12" fill="${muted}">Bug report draft</text>
    <rect x="240" y="80" width="${width - 280}" height="120" rx="12" fill="${card}" stroke="${line}"/>
    <text x="260" y="112" font-family="${font}" font-size="14" fill="${ink}">How can I help you today?</text>
    <rect x="240" y="${height - 120}" width="${width - 280}" height="${inserted ? 72 : 56}" rx="16" fill="${card}" stroke="${line}"/>
    <text x="260" y="${height - 86}" font-family="${font}" font-size="13" fill="${inserted ? ink : muted}">${esc(inserted || 'Message ChatGPT')}</text>`;
}

function paletteOverlay(width) {
  const w = 640;
  const h = 360;
  const x = (width - w) / 2;
  const y = 180;
  const rows = [
    { title: 'Customer onboarding email', body: 'Write a warm welcome email for a new workspace…', on: true },
    { title: 'Bug report template', body: 'Summarize the issue, steps to reproduce, and…', on: false },
    { title: 'Meeting recap', body: 'Turn these notes into a concise recap with…', on: false },
  ];
  const items = rows
    .map((row, i) => {
      const py = y + 108 + i * 72;
      return `
        <rect x="${x + 16}" y="${py}" width="${w - 32}" height="64" rx="10"
          fill="${row.on ? wash : card}"/>
        <text x="${x + 36}" y="${py + 26}" font-family="${font}" font-size="14" font-weight="600" fill="${ink}">${esc(row.title)}</text>
        <text x="${x + 36}" y="${py + 48}" font-family="${font}" font-size="12" fill="${muted}">${esc(row.body)}</text>`;
    })
    .join('');
  return `
    <rect x="0" y="52" width="${width}" height="748" fill="#2A3238" fill-opacity="0.18"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${card}" stroke="${line}"/>
    ${mark(x + 16, y + 14, 28, ink)}
    <text x="${x + 50}" y="${y + 36}" font-family="${font}" font-size="14" font-weight="700" fill="${ink}">Cue Q</text>
    <text x="${x + w - 20}" y="${y + 36}" text-anchor="end" font-family="${font}" font-size="12" fill="${muted}">Alt+I</text>
    <rect x="${x + 16}" y="${y + 56}" width="${w - 32}" height="40" rx="8" fill="${bg}" stroke="${line}"/>
    <text x="${x + 36}" y="${y + 82}" font-family="${font}" font-size="14" fill="${ink}">onboard</text>
    ${items}`;
}

const screenshots = [
  {
    file: 'screenshot-1-signin.png',
    caption: 'Sign in to Cue Q from the toolbar',
    body: (w, h) => `
      ${chromeBar(w)}
      ${chatCanvas(w, h)}
      ${signInPopup()}`,
  },
  {
    file: 'screenshot-2-library.png',
    caption: 'Browse and search your prompt library',
    body: (w, h) => `
      ${chromeBar(w)}
      ${libraryPopup({
        rows: [
          { title: 'Customer onboarding email', body: 'Write a warm welcome email for a new workspace…', shared: true },
          { title: 'Bug report template', body: 'Summarize the issue, steps to reproduce, expected…', shared: true },
          { title: 'Personal writing tone', body: 'Keep sentences short. Avoid jargon. Sound human.', shared: false },
          { title: 'Meeting recap', body: 'Turn notes into a recap with owners and dates.', shared: true },
        ],
      })}`,
  },
  {
    file: 'screenshot-3-folders.png',
    caption: 'Organize prompts in folders and share with your team',
    body: (w, h) => `
      ${chromeBar(w)}
      ${libraryPopup({
        folder: 'Onboarding',
        search: 'Onboarding/',
        highlight: 0,
        rows: [
          { title: 'Customer onboarding email', body: 'Write a warm welcome email for a new workspace…', shared: true },
          { title: 'First-week checklist', body: 'List setup steps for a new teammate in this team.', shared: true },
          { title: 'Product tour script', body: 'Walk through the three core workflows in Cue Q.', shared: false },
        ],
      })}`,
  },
  {
    file: 'screenshot-4-palette.png',
    caption: 'Press Alt+I on ChatGPT or Claude to insert a prompt',
    body: (w, h) => `
      ${chromeBar(w)}
      ${chatCanvas(w, h)}
      ${paletteOverlay(w)}`,
  },
  {
    file: 'screenshot-5-insert.png',
    caption: 'The selected prompt lands in the chat composer',
    body: (w, h) => `
      ${chromeBar(w)}
      ${chatCanvas(w, h, {
        inserted:
          'Write a warm welcome email for a new workspace. Keep it short, name the team, and suggest one next step.',
      })}`,
  },
];

function screenshotSvg(width, height, render, title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${atmosphere(width, height)}
  ${render(width, height)}
  ${caption(width, height, title)}
</svg>`;
}

function promoSmallSvg() {
  const w = 440;
  const h = 280;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${atmosphere(w, h)}
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="20" fill="${card}" stroke="${line}"/>
  ${mark(56, 72, 48, ink)}
  <text x="112" y="104" font-family="${font}" font-size="28" font-weight="700" fill="${ink}">Cue Q</text>
  <text x="56" y="168" font-family="${font}" font-size="16" fill="${muted}">Prompt library for ChatGPT</text>
  <text x="56" y="194" font-family="${font}" font-size="16" fill="${muted}">and Claude — in the chat.</text>
</svg>`;
}

function promoMarqueeSvg() {
  const w = 1400;
  const h = 560;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${atmosphere(w, h)}
  ${mark(80, 160, 72, ink)}
  <text x="168" y="208" font-family="${font}" font-size="52" font-weight="700" fill="${ink}">Cue Q</text>
  <text x="80" y="280" font-family="${font}" font-size="28" fill="${muted}">The prompt library your team</text>
  <text x="80" y="318" font-family="${font}" font-size="28" fill="${muted}">actually uses — in ChatGPT and Claude.</text>
  <text x="80" y="380" font-family="${font}" font-size="18" fill="${primary}">Alt+I to insert a prompt</text>
  <rect x="760" y="80" width="560" height="400" rx="18" fill="${card}" stroke="${line}"/>
  ${mark(784, 100, 32, ink)}
  <text x="824" y="124" font-family="${font}" font-size="18" font-weight="700" fill="${ink}">Cue Q</text>
  <rect x="784" y="152" width="512" height="40" rx="8" fill="${bg}" stroke="${line}"/>
  <text x="804" y="178" font-family="${font}" font-size="14" fill="${muted}">Search prompts…</text>
  <rect x="784" y="208" width="512" height="72" rx="10" fill="${wash}"/>
  <text x="804" y="238" font-family="${font}" font-size="15" font-weight="600" fill="${ink}">Customer onboarding email</text>
  <text x="804" y="262" font-family="${font}" font-size="12" fill="${muted}">Write a warm welcome email for a new workspace…</text>
  <rect x="784" y="292" width="512" height="72" rx="10" fill="${card}" stroke="${line}"/>
  <text x="804" y="322" font-family="${font}" font-size="15" font-weight="600" fill="${ink}">Bug report template</text>
  <text x="804" y="346" font-family="${font}" font-size="12" fill="${muted}">Summarize the issue, steps, and expected result…</text>
  <rect x="784" y="376" width="512" height="72" rx="10" fill="${card}" stroke="${line}"/>
  <text x="804" y="406" font-family="${font}" font-size="15" font-weight="600" fill="${ink}">Meeting recap</text>
  <text x="804" y="430" font-family="${font}" font-size="12" fill="${muted}">Turn notes into a recap with owners and dates.</text>
</svg>`;
}

async function writePng(file, svg, width, height) {
  const dest = path.join(outDir, file);
  await sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'fill' })
    .flatten({ background: bg })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(dest);
  const meta = await sharp(dest).metadata();
  if (meta.width !== width || meta.height !== height) {
    throw new Error(`${file} is ${meta.width}x${meta.height}, expected ${width}x${height}`);
  }
  if (meta.hasAlpha) {
    throw new Error(`${file} still has an alpha channel`);
  }
  console.log(`wrote ${file} (${meta.width}x${meta.height}, channels=${meta.channels})`);
}

await mkdir(outDir, { recursive: true });

for (const shot of screenshots) {
  await writePng(
    shot.file,
    screenshotSvg(1280, 800, shot.body, shot.caption),
    1280,
    800,
  );
}

await writePng('promo-small.png', promoSmallSvg(), 440, 280);
await writePng('promo-marquee.png', promoMarqueeSvg(), 1400, 560);
