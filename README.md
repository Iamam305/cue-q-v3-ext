# Cue Q Extension

WXT + React Chrome extension for Cue Q.

## Setup

1. Copy `.env.example` to `.env` and set `WXT_APP_URL` (default `http://localhost:3000`).
2. In `cue-q`, set `CHROME_EXTENSION_IDS=*` for local development.
3. Run the web app, then:

```bash
npm install
npm run dev
```

Load the unpacked extension from `.output/chrome-mv3-dev`.

## Chrome Web Store

Build a production zip (never upload the `-dev` output):

```bash
npm run zip
```

Upload `.output/cueq-ext-1.0.0-chrome.zip`. Listing copy, privacy answers, and screenshots are in `store/`.

Production `WXT_APP_URL` must be `https://www.cue-q.com` or `https://cue-q.com` (both hosts are permitted). Localhost host permissions are omitted from production builds.

## Auth

Uses Chrome Identity (`launchWebAuthFlow`) against `/api/extension/auth` and `/api/extension/exchange`, then calls APIs with `Authorization: Bearer`.
