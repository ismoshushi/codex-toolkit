# Codex Toolkit

A lightweight Tauri desktop toolkit for Codex users. It combines local usage monitoring with relay/API provider management, so you can see token activity, switch Codex to a relay endpoint, restore the official route, and restart Codex without hand-editing `~/.codex/config.toml`.

## Screenshots

### Dark Mode Dashboard

<img src="./docs/images/app-screenshot.png" alt="Codex Toolkit dark mode dashboard" width="30%" />

### Light Mode Dashboard

<img src="./docs/images/dashboard-view.png" alt="Codex Toolkit light mode dashboard" width="30%" />

### Dark Mode Settings Panel

<img src="./docs/images/settings-dark-view.png" alt="Codex Toolkit dark mode settings panel" width="30%" />

### Settings Panel

<img src="./docs/images/settings-view.png" alt="Codex Toolkit settings panel" width="30%" />

Current release targets: Windows and macOS.

## What It Does

Codex Toolkit reads local Codex session logs from `~/.codex/sessions/*.jsonl` and turns them into a compact desktop dashboard. It also provides a local-first settings panel for managing Codex relay configuration.

It shows:

- Current session token totals
- Last response token usage
- 5-hour and weekly rate-limit windows
- 24-hour and 7-day trend views
- Context window size
- Whether the current Codex route is official or relay-backed
- Tray minimize / restore behavior
- Login autostart and edge snapping
- Privacy mode for hiding local log paths

It can manage:

- Relay enable/disable state
- Custom provider ID, defaulting to `moapi`
- Relay API Base URL
- Relay API Key
- Optional test model label
- Applying relay settings to `~/.codex/config.toml`
- Restoring the official Codex route
- Applying settings and restarting Codex in one action
- English / Chinese UI language switching

## Relay Configuration

When you apply relay settings, Codex Toolkit writes a provider block to `~/.codex/config.toml`. With the default Provider ID, the generated config looks like:

```toml
model_provider = "moapi"

[model_providers.moapi]
name = "moapi"
wire_api = "responses"
requires_openai_auth = true
base_url = "https://your-relay.example.com/v1"
experimental_bearer_token = "sk-..."
```

The Provider ID is editable. If you set it to `myrelay`, Codex Toolkit writes:

```toml
model_provider = "myrelay"

[model_providers.myrelay]
name = "myrelay"
wire_api = "responses"
requires_openai_auth = true
base_url = "https://your-relay.example.com/v1"
experimental_bearer_token = "sk-..."
```

Before writing, Codex Toolkit backs up the existing Codex config as:

```text
config.toml.codexviewer-backup-YYYYMMDD-HHMMSS
```

The restore action removes the active toolkit-managed provider, the default `moapi` provider, and the legacy `CodexViewerRelay` provider if present.

## Why It Exists

OpenAI's public API usage endpoints are designed for organization billing and API usage, not local Codex desktop session analytics. Relay providers also differ in how they expose usage data.

Codex Toolkit focuses on local Codex usage reconstruction by reading session log files already available on your machine, then labels that usage according to your current Codex route: official or relay.

## Tech Stack

- [Tauri v2](https://tauri.app/)
- Rust
- Vanilla HTML / CSS / JavaScript

## Requirements

- Node.js 20+
- Rust toolchain with `cargo`
- Windows: Microsoft Visual Studio C++ Build Tools
- macOS: Xcode Command Line Tools

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Built desktop artifacts are generated under:

- `src-tauri/target/release/bundle/msi`
- `src-tauri/target/release/bundle/nsis`
- `src-tauri/target/release/bundle/dmg`
- `src-tauri/target/release/bundle/macos`

## Validation

Before committing or opening a PR, run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
```

For frontend syntax-only checks:

```powershell
$tmp = Join-Path $env:TEMP 'codex-toolkit-renderer-check.mjs'
Copy-Item src\renderer.js $tmp -Force
node --check $tmp
```

## GitHub Automation

This repository includes two GitHub Actions workflows:

- `CI`: runs tests and verifies the app builds on pushes and pull requests
- `Release`: builds Windows and macOS bundles and uploads them to GitHub Releases when you push a version tag like `v1.0.0`

Example release flow:

```bash
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

After the tag is pushed, GitHub Actions will build the Windows and macOS installers and attach them to a new Release.

## Platform Notes

- Windows release artifacts are generated as `.msi` and `setup.exe`
- The Windows release executable uses the GUI subsystem, so it does not open a console window
- macOS release artifacts are generated as `.dmg` and `.app`
- macOS signing and notarization are not configured yet, so Gatekeeper warnings may still appear on first launch

## How Data Loading Works

The app:

1. Resolves the Codex sessions directory
2. Recursively scans `.jsonl` files
3. Extracts `token_count` events
4. Reads the current toolkit-managed Codex provider status
5. Builds the latest token snapshot and trend series
6. Renders the result in the desktop UI

Default log location:

```text
~/.codex/sessions
```

You can override the log directory from the settings panel.

## Privacy Note

Codex Toolkit reads local session logs from your machine. It does not call the public OpenAI organization usage API to populate the dashboard.

API keys are stored locally in the toolkit settings file and written to Codex config only when you apply relay settings. Avoid sharing screenshots that reveal full local paths or sensitive relay details; use the built-in privacy toggle when needed.

## Open Source Status

This project is intended to be a small open source utility for Codex users. Issues, fixes, and UX improvements are welcome.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

[MIT](./LICENSE)
