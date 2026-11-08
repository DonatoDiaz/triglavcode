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
- [x] Sandbox agent (`.opencode/agent/sandbox.md`): read-only tools + bash-on-ask; `/vet-skill` runs `review` skills through it

## Done (plugins, custom `.opencode/plugins`)
- [x] `usage-analytics`: local SQLite token/cost/tool tracking + `usage_stats` tool (cost shown in CNY + RUB)
- [x] `auto-learn`: per-session activity log (`.opencode/learnings/sessions.jsonl`, falls back to `~/.local/share/triglavcode/learnings/<hash>` when the worktree is read-only) + compaction context injection
- [x] `auto-close-issues`: `close_linked_issues` tool (fixes/closes/resolves #N) + opt-in `TRIGLAV_AUTOCLOSE=1`
- [x] `rag-auto-context`: injects `opencode-rag` hits into system prompt + `rag_query` tool + optional auto-index
- [x] `decision-log`: MADR records in `docs/adr` (`adr_add` / `adr_list`) + compaction context
- [x] `statusline` TUI plugin: model, local/cloud, branch, session tokens/cost, Ollama health
- [x] Theme `triglav` aligned with the VSCode "Triglav Hacker" palette (built-in asset + `~/.opencode/themes/triglav.json` override)

## Remaining gaps vs Hermes
- [x] Auto-close issues on merge — handled by the `auto-close-issues` plugin (`close_linked_issues`); GitHub Actions route no longer required

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
