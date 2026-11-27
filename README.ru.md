<h1 align="center">TRIGLAVCODE</h1>
<p align="center">
  <a href="README.md">English</a> | <a href="README.ru.md">Русский</a> | <a href="README.zh.md">中文</a>
</p>
<p align="center">Открытый AI-агент для программирования — форк TriglavCode.</p>

> [!IMPORTANT]
> TriglavCode — неофициальный форк [opencode](https://github.com/anomalyco/opencode) v1.18.29,
> собираемый из исходников. Проект не связан с opencode и не одобрен его авторами.
> Атрибуция — в [NOTICE](NOTICE) и [NOTICE.ru.md](NOTICE.ru.md).
> Инструкции по установке ниже относятся к upstream opencode; TriglavCode собирается локально командой
> `bun run --cwd packages/opencode build:triglav` (требуется Bun 1.3.14, см. [BASELINE.md](BASELINE.md)).
> Готовые сборки и пакет плагинов публикуются на [странице релизов](https://github.com/DonatoDiaz/triglavcode/releases).

## Что нового в 1.19.1-triglav.1

- **Совместная работа**: `triglavcode pair` поднимает сервер и печатает одноразовую ссылку
  `http://<host>:<port>/auth/connect/<token>` — коллега открывает её в браузере и попадает в тот же
  живой сервер (общие сессии в реальном времени). Ссылка живёт 5 минут, после первого открытия
  переводит в веб-UI с уже подставленными учётными данными.
- **Веб-интерфейс** приведён к стилю TUI: тема **Triglav Hacker** (фиолетовая «хакерская») стала дефолтной; темизированный UI встроен в бинарь.
- **VSCode-расширение** перебрендировано в TriglavCode и содержит тему Triglav Hacker (`sdks/vscode`).
- **Пакет плагинов** (`extras/triglav-plugins`, установщик `extras/install.sh`):
  `economics` (себестоимость + коммерческое предложение заказчику с маржой/налогом/тарифами), `test-data-gen`,
  `delegation-control`, `brigade` (+ агенты `analyst`/`developer`/`tester`), `event-triggers`, `calendar`,
  `knowledge-base`, `media-gen`, `threed` (STL + Blender), `design-ux`.
- **OSINT как MCP-сервер**: отдельный репозиторий на Rust [triglav-osint](https://github.com/DonatoDiaz/triglav-osint) (инструменты `triglav_*`).
- **Документация**: [PDF-руководство](docs/guides/triglavcode-guide.pdf).
- **RAG**: отдельный workspace `~/knowledge` со свободными официальными учебниками (Rust, Python, TypeScript, Bash, docs opencode).
- **Релиз**: [v1.19.1-triglav.1](https://github.com/DonatoDiaz/triglavcode/releases/tag/v1.19.1-triglav.1) — бинарь Linux x64 + пакет плагинов + гайд.

Установка из релиза (вместо инструкций upstream ниже):

```bash
tar -xzf triglavcode-1.19.1-triglav.1-linux-x64.tar.gz -C ~/.local/bin
bash extras/install.sh
```

## Сравнение с OpenCode

| Возможность | OpenCode (upstream) | TriglavCode |
| ------------ | ------------------- | ----------- |
| Версия | Актуальная | `1.19.1-triglav.1` (форк на базе v1.18.29) |
| Бинарник | `opencode` | `triglavcode` |
| Брендинг / тема | Оригинальный | Triglav Hacker — фиолетовая «хакерская» тема (TUI + web), тема VSCode, ASCII-вордмарк |
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

| Файл | Платформа | Что это |
| --- | --- | --- |
| `TriglavCode-Setup-<версия>.exe` | Windows x64 | **Установщик (рекомендуется)** — ставит в профиль, добавляет в `PATH`, делает ярлыки |
| `triglavcode-windows-x64-gui.zip` | Windows x64 | Портативная сборка, TUI+web GUI / RU |
| `triglavcode` | Linux x64 | TUI+web GUI / RU |
| `triglavcode-linux-x64-zh.zip` | Linux x64 | TUI+web GUI / 中文 |
| `triglavcode-windows-x64-zh.zip` | Windows x64 | Портативная сборка / 中文 |

В Linux распакуйте и добавьте в `PATH` (например, симлинком):

```bash
mkdir -p ~/.local/bin
ln -s "$PWD/triglavcode" ~/.local/bin/triglavcode
```

В Windows проще всего скачать `TriglavCode-Setup-<версия>.exe`, запустить и
следовать подсказкам. Права администратора не нужны: программа ставится в
профиль пользователя, папка добавляется в `PATH`, появляются ярлыки
«Пуск → TriglavCode» и (по желанию) на рабочем столе. Можно также взять
портативный архив, распаковать и добавить папку в `PATH`, затем запустить
`triglavcode`. Сборка x64 работает и на Windows on ARM через эмуляцию.

**Аварийный запуск (любая ОС).** Если готовый `.exe`/бинарник не запускается
(антивирус, старое железо, политики Windows и т.п.), используйте
кроссплатформенный Python-лаунчер `triglavcode-launcher.py` из релиза — ему
нужен только Python 3.8+, зависимостей нет. Он сам скачает подходящий бинарник
из релиза и запустит web UI:

```bash
python triglavcode-launcher.py              # web UI (откроется браузер)
python triglavcode-launcher.py --tui        # TUI (Linux/macOS)
python triglavcode-launcher.py --serve      # headless-сервер
python triglavcode-launcher.py -- --help    # передать аргументы триглавкоду
```

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

Windows-установщик собирается из готового бинарника (подробнее —
[`installer/windows/README.md`](installer/windows/README.md)):

```powershell
bun run --cwd packages/opencode script/build.ts --single --skip-install
pwsh ./installer/windows/build-installer.ps1 -Version 1.19.1-triglav.1
# Результат: installer/windows/dist/TriglavCode-Setup-1.19.1-triglav.1.exe
```

### Использование

```bash
triglavcode                 # запуск TUI
triglavcode web             # встроенный веб-GUI
triglavcode run "исправь тесты"   # разовый запуск
triglavcode serve           # headless-сервер
triglavcode pair            # поделиться живой сессией (одноразовая ссылка для совместной работы)
triglavcode env             # показать все переменные TRIGLAV_*
```

Нажмите `F2` в TUI для переключения облако ↔ локально (Ollama). Локальные модели помечены `●`.

### Совместная работа

```bash
triglavcode pair                 # сервер на 0.0.0.0 + одноразовая ссылка (5 мин)
triglavcode pair --ttl 600       # ссылка на 10 минут
triglavcode pair --hostname 127.0.0.1   # только локально
triglavcode pair --session ses_123 --open
```

Команда печатает ссылку вида `http://<host>:<port>/auth/connect/<token>`. Коллега открывает её
в браузере — и попадает в веб-UI, подключённый к тому же серверу: вы видите одни и те же сессии и
сообщения в реальном времени. Ссылка одноразовая и истекает через `--ttl` секунд (по умолчанию 300).
Если `OPENCODE_SERVER_PASSWORD` не задан, генерируется временный пароль на время запуска.

> ⚠️ Ссылка даёт полный доступ к серверу. Передавайте только доверенным людям и не выставляйте
> сервер в интернет без обратного прокси и TLS.

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
