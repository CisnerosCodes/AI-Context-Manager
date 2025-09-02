# AI Context Manager

A Chrome extension that helps you save, organize, and inject reusable context blocks into AI chat interfaces (ChatGPT, Claude, Gemini, Perplexity) with one click.

## Features

- **Context Library**: Create, edit, delete reusable context snippets.
- **One-Click Injection**: Insert a saved context into supported chat inputs.
- **Inline Dropdown**: Access contexts directly inside the AI site (Context ▼ button).
- **Search & Filter**: Quickly find what you need.
- **Import/Export**: Backup or transfer contexts (JSON).
- **Recency Ordering**: Auto-sorts by most recently used.

## Roadmap (Planned / Suggested Enhancements)
- [ ] Pin / favorite contexts
- [ ] Custom tags & multi-tag filtering
- [ ] Optional sync storage toggle (local vs sync)
- [ ] Keyboard navigation & improved accessibility
- [ ] Dark mode styling
- [ ] Variable placeholders (e.g. `{{projectName}}`)
- [ ] Optional encryption for exports
- [ ] Shadow DOM isolation for injected UI
- [ ] Fuzzy search & highlight
- [ ] Template grouping / multi-select insertion
- [ ] Tests (unit + E2E) & CI workflow

## Installation

### Chrome Web Store (Coming Soon)
(Insert link once published.)

### Manual (Developer Mode)
1. Clone or download this repository.
2. Visit `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project root.
5. The extension icon should appear in your toolbar.

## Usage

### Popup
1. Click the extension icon.
2. Add contexts via **+ Add New**.
3. Use search & category filters.
4. Click **Inject** while focused on a supported AI tab to insert.

### Inline Dropdown
1. Open a supported AI chat site.
2. Click the injected **Context ▼** button.
3. Search or select a context to insert at your cursor.

### Import / Export
Popup → **Settings**:
- **Export**: Downloads JSON with metadata.
- **Import**: Merges contexts; existing IDs are not overwritten.

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
├── background/
│   └── background.js
├── content/
│   └── content.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── LICENSE
├── ROADMAP.md
└── README.md
```

## Development Notes
- Manifest V3 service worker background.
- Popup handles CRUD + messaging to content scripts.
- Content script injects dropdown & listens for injections.
- Minimal permissions: only `storage` + host permissions.
- For future dynamic scripting, add the `scripting` permission.

## Contributing
Pull requests welcome. Keep changes atomic & document user-facing updates.

## License
MIT – see LICENSE file.
