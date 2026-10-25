<h1 align="center">TRIGLAVCODE</h1>
<p align="center">
  <a href="README.md">English</a> | <a href="README.ru.md">Русский</a> | <a href="README.zh.md">中文</a>
</p>

> [!IMPORTANT]
> TriglavCode 是基于 [opencode](https://github.com/anomalyco/opencode) v1.18.29 的深度定制分支。
> 目标是提供俄语/中文界面、原生 Ollama 本地降级、Token 节省以及内置的防护命令。

## 特性

- **多语言界面** — TUI/CLI 支持俄语（RU）和中文（ZH），通过不同构建包分发。
- **嵌入式 Web GUI** — 二进制内置前端，运行 `triglavcode web` 即可打开浏览器界面。
- **原生自动降级** — 设置 `TRIGLAV_FALLBACK_MODEL`（如 `ollama/qwen2.5-coder:7b`）即可在云端失败时自动切换到本地模型。TUI 中 `F2` 切换云端/本地，`●` 标识本地模型。
- **Ollama 工具调用代理** — 兼容 Qwen/Coder 等不完全遵循 OpenAI 工具调用格式的 Ollama 模型。
- **Token 优化** — 对次要工具输出进行截断（`TRIGLAV_TOOL_OUTPUT_MAX_CHARS`，默认 24000），但 `read/edit/grep/glob` 输出永不截断。
- **防护命令** — `/vet-skill`、`/heal`、`/review`、`/parallel`、`/complexity`、`/weekly`、`/tooling`、`/close-issues`、`/rmslop`，以及 `/commit` 的 hygiene-gate。
- **沙箱 Agent** — `.opencode/agent/sandbox.md`，默认只读工具，`bash` 需显式批准，供 `/vet-skill` 隔离审查。
- **本地模型管理** — `/status` 可检查 Ollama 健康状态，`triglavcode env` 查看全部 `TRIGLAV_*` 配置。
- **自更新** — 默认关闭，设置 `TRIGLAV_SELF_UPDATE=1` 并使用 GitHub Releases 源 `TRIGLAV_RELEASES_REPO`。
- **Triglav 主题** — 深色配色，自定义 ASCII Logo。

## 安装

TriglavCode 提供 Linux、Windows 的独立二进制包，支持两种语言：**RU**（默认）和 **ZH**（中文）。

最新版本请前往 [Releases 页面](https://github.com/DonatoDiaz/triglavcode/releases) 下载：

| 文件 | 平台 | 界面 / 语言 |
| --- | --- | --- |
| `triglavcode` | Linux x64 | TUI + Web GUI / RU |
| `triglavcode-windows-x64-gui.zip` | Windows x64 | TUI + Web GUI / RU |
| `triglavcode-windows-arm64-gui.zip` | Windows arm64 | TUI + Web GUI / RU |
| `triglavcode-linux-x64-zh.zip` | Linux x64 | TUI + Web GUI / 中文 |
| `triglavcode-windows-x64-zh.zip` | Windows x64 | TUI + Web GUI / 中文 |
| `triglavcode-windows-arm64-zh.zip` | Windows arm64 | TUI + Web GUI / 中文 |

**Linux：** 解压后将二进制放入 `PATH`（如创建软链接）：

```bash
mkdir -p ~/.local/bin
ln -s "$PWD/triglavcode" ~/.local/bin/triglavcode
```

**Windows：** 解压 ZIP，将文件夹添加到 `PATH`，然后运行 `triglavcode`。

内置 Web GUI：运行 `triglavcode web`，浏览器会自动打开或显示链接。

### 从源码构建

需要 **Bun 1.3.14**（参见 [BASELINE.md](BASELINE.md)）：

```bash
# 构建默认（RU）版本
bun run --cwd packages/opencode build:triglav
# 输出：packages/opencode/dist/triglavcode-linux-x64/bin/triglavcode

# 构建中文（ZH）版本
bun run --cwd packages/opencode script/build-zh.ts            # Linux
bun run --cwd packages/opencode script/build-zh.ts --os=win32 # Windows
```

## 使用方法

```bash
triglavcode                 # 启动 TUI
triglavcode web             # 启动嵌入式 Web GUI
triglavcode run "修复测试"   # 一次性运行
triglavcode serve           # 无头服务模式
triglavcode env             # 查看所有 TRIGLAV_* 环境变量
```

在 TUI 中按 `F2` 切换云端/本地（Ollama）模型。本地模型会标记 `●`。

## Agent

TriglavCode 包含上游的所有 agent，额外新增 **sandbox**（`.opencode/agent/sandbox.md`）：
默认只读工具，`bash` 必须显式确认。该 agent 用于 `/vet-skill` 在隔离环境中运行审查类 skill。

## 文档

- [README.md](README.md) — English
- [README.ru.md](README.ru.md) — Русский
- [ROADMAP.md](ROADMAP.md) — 开发路线
- [BASELINE.md](BASELINE.md) — 构建基线与工具链
- [NOTICE](NOTICE) — 归属声明

## 贡献

本项目是 [anomalyco/opencode](https://github.com/anomalyco/opencode) 的精简 fork。请保留兼容性键（`app = "opencode"`、`OPENCODE_*`、npm scope `@opencode-ai/*`）——`opencode-rag` 依赖这些键。

---

**社区（原始项目）** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
