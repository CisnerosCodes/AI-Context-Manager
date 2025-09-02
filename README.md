# AI Context Manager

A Chrome extension that helps you save, organize, and inject reusable context blocks into AI chat interfaces (ChatGPT, Claude, Gemini, Perplexity) with one click.

## Features

- **Context Library**: Create, edit, delete reusable context snippets.
- **One-Click Injection**: Insert a saved context into supported chat inputs.
- **Inline Dropdown**: Access contexts directly inside the AI site (Context ▼ button).
- **Recency Ordering**: Auto-sorts by most recently used.
- **Local Storage**: All data stored locally with chrome.storage.local.

## Installation

### Chrome Web Store (Coming Soon)
(Insert link once published.)

### Manual (Developer Mode)
1. Clone or download this repository.
2. Visit `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project root.
5. The extension icon should appear in your toolbar.

## Quick Start

After installation, the extension provides two ways to use your contexts:

1. **Popup Interface**: Click the extension icon to manage contexts
2. **Inline Access**: Visit supported AI sites and click the "Context ▼" button

## Usage

### Popup
1. Click the extension icon.
2. Click **+ Add** to create a new context.
3. Give your context a title and enter the text content.
4. Save and your context will appear in the list.
5. Use **Edit** or **Delete** to manage existing contexts.

### Inline Dropdown
1. Open a supported AI chat site.
2. Click the injected **Context ▼** button (bottom-right corner).
3. Select a context to insert it at your cursor position.

## Supported Sites
- ChatGPT (`chat.openai.com`)
- Claude (`claude.ai`)
- Gemini (`gemini.google.com`)
- Perplexity (`perplexity.ai`)

## Privacy
All data is stored locally using `chrome.storage.local`. No external servers or tracking. (Future option: opt-in Chrome sync.)

## Project Structure
```text
ai-context-manager/
├── manifest.json
├── src/
│   ├── background/
│   │   └── background.js
│   ├── content/
│   │   └── content.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── storage/
│   │   └── contexts.js
│   └── common/
│       └── constants.js
├── assets/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── LICENSE
├── ROADMAP.md
└── README.md
```

## Development Notes
- Manifest V3 service worker background.
- Popup handles CRUD operations for contexts.
- Content script injects inline dropdown UI.
- Storage abstraction using chrome.storage.local.
- ES modules structure for clean code organization.
- Minimal permissions: only `storage` + host permissions.

## Contributing
Pull requests welcome. Keep changes atomic & document user-facing updates.

## License
MIT – see LICENSE file.
