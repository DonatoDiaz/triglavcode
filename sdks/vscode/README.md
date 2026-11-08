# TriglavCode for VS Code

A Visual Studio Code extension that embeds [TriglavCode](https://github.com/DonatoDiaz/triglavcode) directly into your development workflow, plus the **Triglav Hacker** purple color theme.

## Prerequisites

This extension requires the `triglavcode` CLI to be installed and on your `PATH`.

## Features

- **Quick Launch**: `Ctrl+Esc` (Windows/Linux) or `Cmd+Esc` (Mac) opens TriglavCode in a split terminal, or focuses the existing session.
- **New Session**: `Ctrl+Shift+Esc` / `Cmd+Shift+Esc` starts a new TriglavCode terminal. You can also click the TriglavCode button in the editor title bar.
- **Context Awareness**: Automatically shares your current selection or tab with TriglavCode.
- **File Reference Shortcuts**: `Alt+Ctrl+K` / `Cmd+Option+K` inserts file references like `@File#L37-42`.
- **Triglav Hacker Theme**: An aggressive purple/neon hacker color scheme. Activate it with `Preferences: Color Theme` -> **Triglav Hacker**.

## Support

Issues and feedback: https://github.com/DonatoDiaz/triglavcode/issues

## Development

1. `code sdks/vscode` — open this directory in VS Code (not the repo root).
2. `bun install` — inside `sdks/vscode`.
3. Press `F5` to launch a debug window with the extension loaded.
