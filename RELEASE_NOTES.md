# TriglavCode 1.19.0-triglav.1

Крупный релиз: веб-UI в фирменной теме, пересобранное VSCode-расширение и большой набор
плагинов-расширений агента. Стек проекта: **Rust**, **TypeScript**, **JavaScript**, **Shell**, **CSS/HTML**, **Markdown**.

## 🇷🇺 Что нового

- **Веб-интерфейс** приведён к стилю TUI: тема **Triglav Hacker** (фиолетовая «хакерская» гамма) стала темой по умолчанию,
  исправлен прежний красно-кровавый `triglav.css`, UI встроен в бинарь.
- **VSCode-расширение**: перебрендировано в TriglavCode, запускает `triglavcode`, добавлена тема Triglav Hacker.
- **Пакет плагинов (10)** — в каталоге `extras/triglav-plugins`:
  - `economics` — доходы/расходы, оценка токенов, **себестоимость проекта и коммерческое предложение заказчику** (маржа, скидка, налог, тарифы economy/standard/premium).
  - `test-data-gen` — реалистичные фикстуры/моки из JSON-схемы или SQLite (json/sql/csv/python).
  - `delegation-control` — лимиты субагентов и предотвращение переизбытка делегирования.
  - `brigade` — мультиагентная оркестрация «аналитик → разработчик → тестировщик».
  - `event-triggers` — события GitHub/JSON/JSONL → в сессию агента в реальном времени.
  - `calendar` — задачи, напоминания, дедлайны с фоновыми уведомлениями.
  - `knowledge-base` — Obsidian/Markdown + семантический поиск по RAG-воркспейсу книг.
  - `media-gen` — изображения/аудио/видео (процедурно/ComfyUI/OpenAI), описание картинок (Ollama vision).
  - `threed` — STL по промпту для 3D-печати, анализ меша, headless-рендер Blender.
  - `design-ux` — UX-ревью фронтенда по законам Фиттса/Хика/Миллера, контрасту WCAG, иерархии.
- **Агенты бригады**: `analyst`, `developer`, `tester` (одна модель, разные роли/температура).
- **OSINT-плагин**: отдельный репозиторий [triglav-osint](https://github.com/DonatoDiaz/triglav-osint) (Rust) как MCP-сервер (`triglav_*` инструменты).
- **Документация**: PDF-руководство `docs/guides/triglavcode-guide.pdf` (возможности, плагины, провайдеры, веб-скриншоты).
- **RAG**: отдельный workspace `~/knowledge` с официальными учебниками (Rust Book, Python tutorial, TypeScript handbook, Bash manual, docs opencode) — индексируется локально через `opencode-rag`.

## 🇬🇧 What's new

- **Web UI** now matches the TUI: the **Triglav Hacker** purple theme is the default, the old blood-red `triglav.css`
  was replaced, and the UI is embedded into the binary.
- **VSCode extension** rebranded to TriglavCode (launches `triglavcode`) and ships the Triglav Hacker theme.
- **Plugin pack (10)** under `extras/triglav-plugins`: economics (project cost + **client quote** with margin/discount/tax/tiers),
  test-data-gen, delegation-control, brigade orchestration, event-triggers, calendar, knowledge-base, media-gen,
  threed (STL + Blender), design-ux.
- **Brigade agents**: analyst, developer, tester.
- **OSINT**: separate Rust repo [triglav-osint](https://github.com/DonatoDiaz/triglav-osint) exposed as an MCP server.
- **Docs**: PDF guide (`docs/guides/triglavcode-guide.pdf`) and a dedicated RAG workspace with free official textbooks.

## Установка / Install

```bash
# binary
tar -xzf triglavcode-1.19.0-triglav.1-linux-x64.tar.gz -C ~/.local/bin
# plugins + agents
bash extras/install.sh
```

## Примечания / Notes

- Blender на Arch может требовать `libsycl.so.8` из `/opt/intel/oneapi/compiler/*/lib` — `threed` подставляет `LD_LIBRARY_PATH` автоматически.
- Экономика: суммы в USD/RUB/CNY; курсы берутся из `open.er-api.com` (кэш 6 ч) с фолбэком.
- Плагины — обычный JS; выключаются переменными окружения (`TRIGLAV_ECON=0` и т.п.).
