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
- [x] `parallel` (parallel dispatch), `complexity` (triage), `weekly` (session lessons retro)
- [x] `tooling` (dynamic/reputation-gated skill index + `.opencode/tooling-index.json`)
- [x] `bin/triglav-router` auto-fallback: primary provider down → `ollama/qwen2.5:latest`
- [x] Native in-binary fallback (`TRIGLAV_FALLBACK_MODEL`) verified end-to-end
- [x] TUI F2 local/cloud model toggle + `●` local model indicator
- [x] CI: `.github/workflows/triglav-release.yml` (Linux/macOS/Windows release builds) — file ready locally; push deferred (needs GitHub `workflow` scope for OAuth token)
- [x] `vet-skill`: sandbox/vault pipeline for third-party skills (Hermes parity)
- [x] Auto-close GitHub issues command (`/close-issues`) (Hermes parity)
- [x] `systematic-debugger` skill alongside `/heal` (Hermes parity)
- [x] Token efficiency: non-critical tool output capped 24k (`TRIGLAV_TOOL_OUTPUT_MAX_CHARS`) per turn; quality-critical tools (`read`/`edit`/`grep`/`glob`) never truncated
- [x] `/status` shows local-fallback readiness (Ollama health probe)
- [x] `triglavcode env` command and full `TRIGLAV_*` docs in README
- [x] Self-update via GitHub Releases (`TRIGLAV_RELEASES_REPO`, default `DonatoDiaz/triglavcode`)

## Remaining gaps vs Hermes
- [ ] Auto-close issues via GitHub Actions on PR merge (requires `workflow` scope push; `gh workflow` once GITHUB_TOKEN has access)

## Planned
- [ ] Auto-refresh provider/model/status data (low priority)
- [ ] Review provider presets for Triglav defaults if needed
- [ ] Verify GUI build once `@solidjs/start` is available
- [ ] Adaptive tool-output cap per model context (e.g. 5% of context window)

## Principles
- Minimal diff vs upstream, keep compatibility keys intact
- Russian for user-facing UI where localized
- Surface branding only
- Reliable local fallback first
