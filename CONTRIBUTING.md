# Contributing

Thanks for helping improve Codex Toolkit.

## Before You Start

- Check existing issues before opening a new one
- Keep changes focused and easy to review
- Prefer small pull requests over large mixed refactors

## Local Setup

```bash
npm install
npm run dev
```

## Validation

Before opening a PR, please run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
```

## Contribution Guidelines

- Keep the app lightweight
- Preserve the existing desktop-widget feel
- Avoid introducing heavy frontend frameworks unless there is a strong reason
- Prefer clear UI copy and stable local-first behavior
- Do not commit `node_modules` or `src-tauri/target`

## Pull Requests

Good pull requests usually include:

- A short summary of the change
- Why the change was needed
- Notes about testing
- Screenshots for visible UI changes

## Bug Reports

When reporting bugs, include:

- Your OS version
- Whether you ran the dev build or release build
- What you expected to happen
- What actually happened
- A screenshot if the issue is visual
