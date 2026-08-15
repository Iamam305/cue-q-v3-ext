# Permission justifications

Paste these into the dashboard when Chrome asks why each permission or host is required. Keep them short and specific.

## `identity`

Used to sign the user into their Cue Q account with Chrome Identity (`launchWebAuthFlow`) against cue-q.com. Required so the extension can load that user’s prompt library. We do not use this permission to access Google account data beyond completing Cue Q sign-in.

## `storage`

Used to save the Cue Q session token and a local copy of the signed-in profile (`id`, `name`, `email`, optional `image`) in `chrome.storage.local` so the user stays signed in. Cleared on sign out. Not used for analytics.

## Host permission: `https://cue-q.com/*` and `https://www.cue-q.com/*`

Used only to call Cue Q HTTPS APIs: extension auth and token exchange, current user, prompts, and folders. The extension does not access any other origin.

## Content scripts on ChatGPT and Claude

Declared matches:

- `*://chatgpt.com/*`
- `*://chat.openai.com/*`
- `*://claude.ai/*`

The content script adds an Alt+I search palette and inserts the prompt the user selects into the chat composer. It does not read, store, or send conversation history or other page content.

## Permissions we do **not** request

Do not add these. They are unused in production:

- `tabs`, `scripting`, `cookies`, `webRequest`, `debugger`, `clipboardRead` / `clipboardWrite`
- localhost or `127.0.0.1` hosts (dev builds only)
