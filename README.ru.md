<h1 align="center">TRIGLAVCODE</h1>
<p align="center">Открытый AI-агент для программирования — форк TriglavCode.</p>

> [!IMPORTANT]
> TriglavCode — неофициальный форк [opencode](https://github.com/anomalyco/opencode) v1.18.29,
> собираемый из исходников. Проект не связан с opencode и не одобрен его авторами.
> Атрибуция — в [NOTICE](NOTICE) и [NOTICE.ru.md](NOTICE.ru.md).
> Инструкции по установке ниже относятся к upstream opencode; TriglavCode собирается локально командой
> `bun run --cwd packages/opencode build:triglav` (требуется Bun 1.3.14, см. [BASELINE.md](BASELINE.md)).

## Сравнение с OpenCode

| Возможность | OpenCode (upstream) | TriglavCode |
| ------------ | ------------------- | ----------- |
| Версия | Актуальная | `1.18.29-triglav.1` (форк на базе v1.18.29) |
| Бинарник | `opencode` | `triglavcode` |
| Брендинг / тема | Оригинальный | Triglav — тёмная тема (кровь/янтарь/фиолет), ASCII-вордмарк |
| Русификация TUI/CLI | Отсутствует/минимальная | Полная русификация пользовательских строк TUI и CLI |
| Self-update | Включён | Отключён (только при `TRIGLAV_SELF_UPDATE=1`) |
| Локальные модели Ollama + tool calling | Требует ручной настройки | Готовый fallback: `ollama/qwen2.5:latest`, `ollama/qwen2.5-coder-64k`, `ollama/qwen2.5-coder:7b` (с плагином `opencode-ollama-toolcall-proxy`) |
| Совместимость с opencode-rag | Нативная | Сохранена (`app="opencode"`, `OPENCODE_*`, npm-скоуп не изменены) |
| Автообновление каталога моделей/провайдеров | `OPENCODE_MODELS_URL` / `OPENCODE_MODELS_PATH` / `OPENCODE_DISABLE_MODELS_FETCH` | То же + `TRIGLAV_MODELS_URL` / `TRIGLAV_MODELS_PATH` / `TRIGLAV_DISABLE_MODELS_FETCH` (встроенный рефреш раз в 60 мин, кэш TTL 5 мин) |
| README/NOTICE | EN | Добавлены `README.ru.md`, `NOTICE.ru.md` |
| Roadmap | — | `ROADMAP.md`, `ROADMAP.ru.md` |
| Встроенные guardrails (аналог Hermes-обвязки) | Внешние скрипты/координатор | Нативно: `/vet-skill`, `/heal`, `/review`, `/parallel`, `/complexity`, `/weekly`, `/tooling`; hygiene-gate в `/commit` |
| Авто-fallback на локальную Ollama | Вручную | Нативно в бинаре: `TRIGLAV_FALLBACK_MODEL` (провайдер недоступен → повтор с `ollama/qwen2.5:latest`, в поток вставляется уведомление); также обёртка `bin/triglav-router` |
| Быстрое переключение модели в TUI | — | `F2` — мгновенный toggle облако↔локально; локальные модели помечены `●` |
| Экономия токенов | Полные tool-output отправляются заново в каждом шаге | Второстепенные выводы тулзов режутся до 24k символов (`TRIGLAV_TOOL_OUTPUT_MAX_CHARS`); критичные для качества тулы (`read`, `edit`, `grep`, `glob`) **никогда не обрезаются**; prompt caching; компакция резервирует окно вывода |
| Установка/запуск | `opencode` | `triglavcode` (симлинк/бинарь) |
| Требования к сборке | — | Bun 1.3.14 (см. `BASELINE.md`) |

## Переменные окружения TriglavCode

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `TRIGLAV_SELF_UPDATE` | выкл | `1` включает проверку обновлений (`triglav upgrade`). В fork-сборках по умолчанию выключено. |
| `TRIGLAV_MODELS_URL` | — | Альтернативный источник каталога моделей/провайдеров (как `OPENCODE_MODELS_URL`). |
| `TRIGLAV_MODELS_PATH` | — | Путь к локальному файлу каталога моделей вместо URL. |
| `TRIGLAV_DISABLE_MODELS_FETCH` | выкл | `1` — не загружать каталог моделей. |
| `TRIGLAV_FALLBACK_MODEL` | — | Запасная модель при недоступности основного провайдера (например `ollama/qwen2.5:latest`). В поток вставляется уведомление. |
| `TRIGLAV_OLLAMA_URL` | `http://localhost:11434` | Базовый URL для проверки доступности Ollama в `/status`. |
| `TRIGLAV_TOOL_OUTPUT_MAX_CHARS` | `24000` | Лимит второстепенного вывода тулзов в контекст за шаг. `read`, `edit`, `grep`, `glob` не обрезаются никогда. |
| `TRIGLAV_RELEASES_REPO` | `DonatoDiaz/triglavcode` | GitHub-репозиторий для `triglav upgrade` (ищет последний релиз `triglav-*`). |
| `TRIGLAV_PROBE_URL` | `https://api.aitunnel.ru/v1/models` | URL проверки доступности основного провайдера для `bin/triglav-router`. |
| `TRIGLAV_PROBE_TIMEOUT` | `5` | Таймаут проверки (сек) для `bin/triglav-router`. |
| `TRIGLAV_ROUTER` | `1` | `0` отключает авто-роутер `bin/triglav-router`. |
| `TRIGLAV_BIN` | `triglavcode` | Имя бинаря для `bin/triglav-router`. |

Текущие значения: `triglavcode env` (или `triglavcode env --all`).

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

### Установка

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Менеджеры пакетов
npm i -g opencode-ai@latest        # или bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS и Linux (рекомендуем, всегда актуально)
brew install opencode              # macOS и Linux (официальная формула brew, обновляется реже)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # любая ОС
nix run nixpkgs#opencode           # или github:anomalyco/opencode для самой свежей ветки dev
```

> [!TIP]
> Перед установкой удалите версии старше 0.1.x.

### Десктопное приложение (BETA)

OpenCode также доступен как десктопное приложение. Скачайте его со [страницы релизов](https://github.com/anomalyco/opencode/releases) или с [opencode.ai/download](https://opencode.ai/download).

| Платформа             | Загрузка                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm` или AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Каталог установки

Скрипт установки выбирает путь установки в следующем порядке приоритета:

1. `$OPENCODE_INSTALL_DIR` - Пользовательский каталог установки
2. `$XDG_BIN_DIR` - Путь, совместимый со спецификацией XDG Base Directory
3. `$HOME/bin` - Стандартный каталог пользовательских бинарников (если существует или можно создать)
4. `$HOME/.opencode/bin` - Fallback по умолчанию

```bash
# Примеры
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Agents

В OpenCode есть два встроенных агента, между которыми можно переключаться клавишей `Tab`.

- **build** - По умолчанию, агент с полным доступом для разработки
- **plan** - Агент только для чтения для анализа и изучения кода
  - По умолчанию запрещает редактирование файлов
  - Запрашивает разрешение перед выполнением bash-команд
  - Идеален для изучения незнакомых кодовых баз или планирования изменений

Также включен сабагент **general** для сложных поисков и многошаговых задач.
Он используется внутренне и может быть вызван в сообщениях через `@general`.

Подробнее об [agents](https://opencode.ai/docs/agents).

### Документация

Больше информации о том, как настроить OpenCode: [**наши docs**](https://opencode.ai/docs).

### Вклад

Если вы хотите внести вклад в OpenCode, прочитайте [contributing docs](./CONTRIBUTING.md) перед тем, как отправлять pull request.

### Разработка на базе OpenCode

Если вы делаете проект, связанный с OpenCode, и используете "opencode" как часть имени (например, "opencode-dashboard" или "opencode-mobile"), добавьте примечание в README, чтобы уточнить, что проект не создан командой OpenCode и не аффилирован с нами.

---

**Присоединяйтесь к нашему сообществу** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
