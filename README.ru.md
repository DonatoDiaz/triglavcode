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

TriglavCode распространяется в виде готовых бинарников для Linux и Windows на двух локализациях:
**RU** (по умолчанию) и **ZH** (中文). Последний релиз — [страница релизов](https://github.com/DonatoDiaz/triglavcode/releases).

| Файл | Платформа | Интерфейс / Язык |
| --- | --- | --- |
| `triglavcode` | Linux x64 | TUI+web GUI / RU |
| `triglavcode-windows-x64-gui.zip` | Windows x64 | TUI+web GUI / RU |
| `triglavcode-windows-arm64-gui.zip` | Windows arm64 | TUI+web GUI / RU |
| `triglavcode-linux-x64-zh.zip` | Linux x64 | TUI+web GUI / 中文 |
| `triglavcode-windows-x64-zh.zip` | Windows x64 | TUI+web GUI / 中文 |
| `triglavcode-windows-arm64-zh.zip` | Windows arm64 | TUI+web GUI / 中文 |

В Linux распакуйте и добавьте в `PATH` (например, симлинком):

```bash
mkdir -p ~/.local/bin
ln -s "$PWD/triglavcode" ~/.local/bin/triglavcode
```

В Windows распакуйте архив и добавьте папку в `PATH`, запустите `triglavcode`.

Встроенный веб-GUI доступен командой `triglavcode web`.

Сборка из исходников:

```bash
# Требуется Bun 1.3.14 (см. BASELINE.md)
bun run --cwd packages/opencode build:triglav
# Результат: packages/opencode/dist/triglavcode-linux-x64/bin/triglavcode

# Китайская сборка:
bun run --cwd packages/opencode script/build-zh.ts            # Linux
bun run --cwd packages/opencode script/build-zh.ts --os=win32 # Windows
```

### Использование

```bash
triglavcode                 # запуск TUI
triglavcode web             # встроенный веб-GUI
triglavcode run "исправь тесты"   # разовый запуск
triglavcode serve           # headless-сервер
triglavcode env             # показать все переменные TRIGLAV_*
```

Нажмите `F2` в TUI для переключения облако ↔ локально (Ollama). Локальные модели помечены `●`.

### Agents

В TriglavCode есть агенты из апстрима плюс агент **sandbox**
(`.opencode/agent/sandbox.md`): read-only инструменты, а `bash` только после явного
подтверждения (permission `ask`). Используется `/vet-skill` для изолированного
прогона скиллов с вердиктом `review`.

### Документация

- [README.md](README.md) — английская версия
- [ROADMAP.ru.md](ROADMAP.ru.md) — планы развития
- [BASELINE.md](BASELINE.md) — baseline и тулчейн сборки

### Вклад

Сначала форкните [anomalyco/opencode](https://github.com/anomalyco/opencode); TriglavCode —
тонкий форк поверх него. Сохраняйте ключи совместимости (`app="opencode"`, `OPENCODE_*`,
npm-скоуп) — на них завязан opencode-rag. Атрибуция: [NOTICE](NOTICE).

---

**Комьюнити исходного проекта** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
