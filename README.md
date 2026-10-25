<h1 align="center">TRIGLAVCODE</h1>
<p align="center">The open source AI coding agent — TriglavCode fork.</p>

> [!IMPORTANT]
> TriglavCode is an unofficial fork of [opencode](https://github.com/anomalyco/opencode) v1.18.29,
> built from source. It is not affiliated with or endorsed by the opencode project.
> See [NOTICE](NOTICE) for attribution.
> The installation instructions below describe upstream opencode; TriglavCode is built locally with
> `bun run --cwd packages/opencode build:triglav` (Bun 1.3.14 required, see [BASELINE.md](BASELINE.md)).

## Comparison with OpenCode

| Feature | OpenCode (upstream) | TriglavCode |
| --- | --- | --- |
| Version | Current | `1.18.29-triglav.1` (fork of v1.18.29) |
| Binary | `opencode` | `triglavcode` |
| Branding / theme | Original | Triglav dark theme (blood/amber/violet), ASCII wordmark |
| TUI/CLI localization | None/minimal | Full localization of user-facing TUI/CLI strings (Russian) |
| Self-update | Enabled | Disabled (only with `TRIGLAV_SELF_UPDATE=1`) |
| Local Ollama models + tool calling | Manual setup | Ready fallback: `ollama/qwen2.5:latest`, `ollama/qwen2.5-coder-64k`, `ollama/qwen2.5-coder:7b` (via `opencode-ollama-toolcall-proxy`) |
| Auto-refresh model/provider catalog | `OPENCODE_MODELS_URL` / `OPENCODE_MODELS_PATH` / `OPENCODE_DISABLE_MODELS_FETCH` | Same + `TRIGLAV_MODELS_URL` / `TRIGLAV_MODELS_PATH` / `TRIGLAV_DISABLE_MODELS_FETCH` (built-in 60-min refresh, 5-min cache TTL) |
| opencode-rag compatibility | Native | Preserved (`app="opencode"`, `OPENCODE_*`, npm scope unchanged) |
| README/NOTICE | EN | `README.ru.md`, `NOTICE.ru.md` added |
| Roadmap | — | `ROADMAP.md`, `ROADMAP.ru.md` |
| Guardrail commands (Hermes-style wrap) | External scripts | Built-in: `/vet-skill`, `/heal`, `/review`, `/parallel`, `/complexity`, `/weekly`, `/tooling`; commit hygiene gate |
| Auto-fallback to local Ollama | Manual | Native in-binary: `TRIGLAV_FALLBACK_MODEL` (provider down → retry with `ollama/qwen2.5:latest`, notice text injected); also `bin/triglav-router` wrapper |
| TUI local-model switch | — | `F2` toggles cloud↔local instantly; local models marked with `●` |
| Token efficiency | Full tool outputs re-sent every turn | Non-critical tool results capped at 24k chars (`TRIGLAV_TOOL_OUTPUT_MAX_CHARS`); quality-critical tools (`read`, `edit`, `grep`, `glob`) are never truncated; prompt caching; compaction reserves output window |
| Install/run | `opencode` | `triglavcode` (symlink/binary) |
| Build requirements | — | Bun 1.3.14 (see `BASELINE.md`) |

## TriglavCode environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRIGLAV_SELF_UPDATE` | off | Set `1` to enable self-update checks (`triglav upgrade`). Off by default in fork builds. |
| `TRIGLAV_MODELS_URL` | — | Override the model/provider catalog source (same as `OPENCODE_MODELS_URL`). |
| `TRIGLAV_MODELS_PATH` | — | Path to a local models catalog file instead of a URL. |
| `TRIGLAV_DISABLE_MODELS_FETCH` | off | Set `1` to skip fetching the models catalog. |
| `TRIGLAV_FALLBACK_MODEL` | — | Fallback model used automatically when the primary provider is down (e.g. `ollama/qwen2.5:latest`). Notice text is injected into the stream. |
| `TRIGLAV_OLLAMA_URL` | `http://localhost:11434` | Base URL used by `/status` to probe local Ollama health. |
| `TRIGLAV_TOOL_OUTPUT_MAX_CHARS` | `24000` | Cap on non-critical tool-result text sent to the model each turn. `read`, `edit`, `grep` and `glob` are never truncated. |
| `TRIGLAV_RELEASES_REPO` | `DonatoDiaz/triglavcode` | GitHub repo used by `triglav upgrade` to find the latest `triglav-*` release. |
| `TRIGLAV_PROBE_URL` | `https://api.aitunnel.ru/v1/models` | Primary-provider health URL for `bin/triglav-router`. |
| `TRIGLAV_PROBE_TIMEOUT` | `5` | Probe timeout (seconds) for `bin/triglav-router`. |
| `TRIGLAV_ROUTER` | `1` | Set `0` to disable the `bin/triglav-router` auto-fallback wrapper. |
| `TRIGLAV_BIN` | `triglavcode` | Binary name used by `bin/triglav-router`. |

Run `triglavcode env` to inspect current values.

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### Installation

TriglavCode is distributed as a standalone binary. Grab the latest release from the
[Releases page](https://github.com/DonatoDiaz/triglavcode/releases), or build from source:

```bash
# Requires Bun 1.3.14 (see BASELINE.md)
bun run --cwd packages/opencode build:triglav
# Output: packages/opencode/dist/triglavcode-linux-x64/bin/triglavcode
```

Then put the binary on your `PATH` (e.g. symlink it to `~/.local/bin/triglavcode`).

### Usage

```bash
triglavcode                 # start TUI
triglavcode run "fix the tests"   # one-shot run
triglavcode serve           # headless server
triglavcode env             # inspect all TRIGLAV_* variables
```

### Agents

TriglavCode includes the upstream agents plus a **sandbox** agent
(`.opencode/agent/sandbox.md`): read-only tools with `bash` gated behind an
explicit approval prompt. It is used by `/vet-skill` to run `review`-verdict
skills in isolation.

### Documentation

- [README.ru.md](README.ru.md) — русская версия
- [ROADMAP.md](ROADMAP.md) — планы развития
- [BASELINE.md](BASELINE.md) — baseline и тулчейн сборки

### Contributing

Fork [anomalyco/opencode](https://github.com/anomalyco/opencode) first; TriglavCode
is a thin fork on top of it. Keep compatibility keys (`app="opencode"`, `OPENCODE_*`,
npm scope) intact — opencode-rag relies on them. See [NOTICE](NOTICE) for attribution.

---

**Комьюнити исходного проекта** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
