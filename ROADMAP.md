# TriglavCode Roadmap

## Done (v1.18.29-triglav.1)
- [x] Fork of opencode v1.18.29 to TriglavCode with minimal branding
- [x] Binary renamed to `triglavcode`, Triglav ASCII wordmark, dark theme
- [x] Russian localization of TUI/CLI user-facing strings
- [x] Self-update disabled by default (only via `TRIGLAV_SELF_UPDATE=1`)
- [x] Added `README.ru.md`, `NOTICE.ru.md`
- [x] Preserved opencode-rag compatibility (`app="opencode"`, `OPENCODE_*`)
- [x] Local Ollama models with tool calling fallback: `qwen2.5:latest`, `qwen2.5-coder-64k`, `qwen2.5-coder:7b`
- [x] Comparison table added to README
- [x] Built-in guardrail commands: `vet-skill` (security pipeline), `heal` (auto-heal loop), `review` (gated PR review), `commit` hygiene gate

## Planned
- [ ] Auto-refresh provider/model/status data (low priority)
- [ ] Review provider presets for Triglav defaults if needed
- [ ] Verify GUI build once `@solidjs/start` is available

## Principles
- Minimal diff vs upstream, keep compatibility keys intact
- Russian for user-facing UI where localized
- Surface branding only
- Reliable local fallback first
