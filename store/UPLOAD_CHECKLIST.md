# Chrome Web Store upload checklist

Complete this in order. Reviewers will reject the item if the privacy URL is missing or the zip still contains localhost host permissions.

## Before you upload

- [ ] Deploy **cue-q** so these URLs load over HTTPS (no login wall):
  - https://cue-q.com/privacy
  - https://cue-q.com/terms
  - https://cue-q.com/support
- [ ] In `cueq-ext/.env`, set `WXT_APP_URL` to `https://www.cue-q.com` or `https://cue-q.com` (not localhost).
- [ ] On cue-q, set `CHROME_EXTENSION_IDS` to the production extension id after the first upload (you can use `*` only for local dev).
- [ ] From `cueq-ext`: `npm run zip`
- [ ] Confirm you will upload **`.output/cueq-ext-1.0.0-chrome.zip`**
- [ ] Do **not** upload `.output/chrome-mv3-dev` (extra permissions and a looser CSP)

Spot-check the unzipped `manifest.json`:

- `manifest_version` is `3`
- `permissions` are only `identity` and `storage`
- `host_permissions` are only `https://cue-q.com/*` and `https://www.cue-q.com/*`
- no `localhost` or `127.0.0.1`
- `homepage_url` is `https://cue-q.com`

## Developer account

- [ ] Register at https://chrome.google.com/webstore/devconsole ($5 one-time fee)
- [ ] Publisher email can receive review mail (use ajitesh@cue-q.com)

## Create the item

1. **New item** → upload the zip.
2. **Product details** — paste from [LISTING.md](LISTING.md).
3. **Graphic assets** — 128px icon comes from the zip; add the five screenshots and optional promo tiles from `store/assets/`.
4. **Privacy** — policy URL `https://cue-q.com/privacy`; answers from [PRIVACY_PRACTICES.md](PRIVACY_PRACTICES.md).
5. **Permissions** — justifications from [PERMISSION_JUSTIFICATIONS.md](PERMISSION_JUSTIFICATIONS.md).
6. **Test instructions** — credentials plus additional steps from [TEST_INSTRUCTIONS.md](TEST_INSTRUCTIONS.md).
7. **Distribution** — regions, public vs unlisted, no mature content, no payments.

## After Google assigns an extension ID

1. Add that ID to cue-q `CHROME_EXTENSION_IDS` and redeploy (auth will reject unknown extension ids).
2. If you uploaded before the ID was allowlisted, sign-in may fail until this deploy.
3. Submit for review.

## After approval

- [ ] Install from the store listing and test sign-in, library, and Alt+I insert on ChatGPT and Claude.
- [ ] Add the store URL to the Cue Q site and `public/llms.txt` (not before).
