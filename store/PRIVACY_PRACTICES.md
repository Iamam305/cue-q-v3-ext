# Chrome Web Store — Privacy practices

Use these answers on the **Privacy practices** tab. They match what the extension actually does. Do not check extra data types “just in case.”

Required policy URL: **https://cue-q.com/privacy**

## Does this item collect or use any user data?

**Yes.**

## Data types used

Check **only** these:

| Category | Collect? | Notes |
| --- | --- | --- |
| Personally identifiable information | **Yes** | Name, email, optional profile image (from the Cue Q account) |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | **Yes** | Cue Q session / bearer token stored in `chrome.storage.local` |
| Personal communications | No | |
| Location | No | |
| Web history | No | |
| User activity | No | No analytics in the extension |
| Website content | **No** | Content scripts insert text the user selects; they do not read or transmit ChatGPT/Claude chats or page content |

If a later form asks *how* PII and auth data are used, select:

- **Account and user management** (sign-in, keep the session)
- **App functionality** (load and insert the user’s prompts)

Do **not** select advertising, analytics, personalization beyond the library, or “sold to third parties.”

## Certification (Limited Use)

Certify that:

- User data is used only to provide Cue Q features the user expects (sign-in and prompt library access).
- Data is not sold.
- Data is not used for unrelated credit, advertising, or profiling.
- We do not collect ChatGPT or Claude conversation content.

## Remote code

**No.** All scripts and fonts ship inside the extension package. The extension does not fetch or execute remote JavaScript.

## Host permission disclosure

The extension requests host access to:

- `https://cue-q.com/*`
- `https://www.cue-q.com/*`

Purpose: Cue Q API only (auth, current user, prompts, folders). No other websites.

## Content scripts

Matches: `chatgpt.com`, `chat.openai.com`, `claude.ai`

Purpose: show the Alt+I prompt palette and insert the chosen prompt into the composer. **Not** to scrape or store page content.

## Encryption

Data in transit to Cue Q uses HTTPS.

## Privacy policy highlights (for the reviewer)

The live policy at https://cue-q.com/privacy states:

- Operator contact: ajitesh@cue-q.com
- Account data lives on Cue Q; the extension stores a local session copy
- No extension analytics or ads
- How to sign out (clears local storage) and how to request account deletion
