# Chrome Web Store package

Use this folder to submit Cue Q.

| File | What to paste |
| --- | --- |
| [LISTING.md](LISTING.md) | Name, summary, description, screenshots |
| [PRIVACY_PRACTICES.md](PRIVACY_PRACTICES.md) | Privacy questionnaire |
| [PERMISSION_JUSTIFICATIONS.md](PERMISSION_JUSTIFICATIONS.md) | identity, storage, hosts, content scripts |
| [UPLOAD_CHECKLIST.md](UPLOAD_CHECKLIST.md) | Step-by-step submit order |
| [assets/](assets/) | 1280×800 screenshots and promo tiles |

Production zip (from this package root):

```bash
npm run zip
```

Upload `.output/cueq-ext-1.0.0-chrome.zip`. Deploy https://cue-q.com/privacy first — Google fetches it during review.
