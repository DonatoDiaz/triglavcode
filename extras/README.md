# TriglavCode plugin pack (extras)

Готовые плагины и агенты для TriglavCode/opencode, которые расширяют агента.
Portable-копии (без абсолютных symlink), чтобы их можно было версионировать и ставить на любой машине.

## Состав

| Плагин | Инструменты | Назначение |
|---|---|---|
| `economics` | `econ_entry`, `econ_summary`, `econ_token_estimate`, `econ_report`, `econ_settings`, `econ_project_cost`, `econ_quote` | Экономика проекта: доходы/расходы, оценка токенов, себестоимость и **коммерческое предложение заказчику** (маржа, скидка, налог, тарифы). |
| `test-data-gen` | `generate_fixtures` | Реалистичные фикстуры/моки по JSON-схеме или SQLite-таблице (json/sql/csv/python). |
| `delegation-control` | `delegation_status` + hooks | Лимиты субагентов (общий/на сессию), блокировка переизбытка. |
| `brigade` | `brigade_run` | Мультиагентная оркестрация: аналитик → разработчик → тестировщик (или свои роли). |
| `event-triggers` | `trigger_add`, `trigger_list`, `trigger_remove`, `trigger_poll` | События из GitHub/произвольного JSON/JSONL-инбокса → в сессию агента. |
| `calendar` | `cal_add`, `cal_list`, `cal_agenda`, `cal_done`, `cal_remove` | Задачи, события, напоминания, дедлайны с фоновыми уведомлениями. |
| `knowledge-base` | `kb_config`, `kb_search`, `kb_semantic`, `kb_read`, `kb_list`, `kb_write`, `kb_backlinks`, `kb_tags` | Obsidian/Markdown + семантический поиск по RAG-воркспейсу книг. |
| `media-gen` | `media_backends`, `image_generate`, `audio_generate`, `video_generate`, `image_describe` | Генерация изображений/аудио/видео (процедурно/ComfyUI/OpenAI), описание картинок (Ollama vision). |
| `threed` | `stl_from_prompt`, `stl_info`, `blender_render` | STL по промпту (3D-печать), анализ меша, headless-рендер Blender. |
| `design-ux` | `ux_review`, `ux_checklist` | UX-ревью фронтенда по законам Фиттса/Хика/Миллера, контрасту WCAG, иерархии. |

Агенты для `brigade`: `analyst`, `developer`, `tester` (одна модель, разные роли/температура).

## Установка

```bash
# из корня репозитория
bash extras/install.sh
```

Вручную:
```bash
cp -r extras/triglav-plugins/* ~/.opencode/plugins/
cp extras/triglav-agents/*.md ~/.config/opencode/agent/
```
И добавьте в `~/.config/opencode/opencode.jsonc` (или проектный `opencode.json`):
```jsonc
"plugin": [
  "file:///home/<user>/.opencode/plugins/economics/index.js",
  "file:///home/<user>/.opencode/plugins/test-data-gen/index.js",
  "file:///home/<user>/.opencode/plugins/delegation-control/index.js",
  "file:///home/<user>/.opencode/plugins/brigade/index.js",
  "file:///home/<user>/.opencode/plugins/event-triggers/index.js",
  "file:///home/<user>/.opencode/plugins/calendar/index.js",
  "file:///home/<user>/.opencode/plugins/knowledge-base/index.js",
  "file:///home/<user>/.opencode/plugins/media-gen/index.js",
  "file:///home/<user>/.opencode/plugins/threed/index.js",
  "file:///home/<user>/.opencode/plugins/design-ux/index.js"
]
```

Плагин `_shared` (`tc.js`, `rates.js`) общий — не подключается отдельно, но должен лежать рядом (`~/.opencode/plugins/_shared/`).

## Переменные окружения (кратко)

- Экономика: `TRIGLAV_ECON=0`, `TRIGLAV_ECON_DB`.
- Делегирование: `TRIGLAV_DELEGATION=0`, `TRIGLAV_MAX_SUBAGENTS` (3), `TRIGLAV_MAX_SUBAGENTS_PER_SESSION` (2).
- Бригада: `TRIGLAV_BRIGADE=0`, `TRIGLAV_BRIGADE_MAX`.
- Триггеры: `TRIGLAV_TRIGGERS=0`, `TRIGLAV_TRIGGER_TICK_MS`, `GITHUB_TOKEN`.
- Календарь: `TRIGLAV_CALENDAR=0`, `TRIGLAV_CALENDAR_TICK_MS`.
- Медиа: `TRIGLAV_MEDIA_DIR`, `COMFYUI_URL`, `COMFY_WORKFLOW`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`, `OLLAMA_VISION_MODEL`.
- 3D: `TRIGLAV_3D_DIR`, `BLENDER_BIN` (Blender 5.x на Arch требует `LD_LIBRARY_PATH` с `libsycl.so.8`; плагин подставляет автоматически из `/opt/intel/oneapi/compiler/*/lib`).
- KB: `OBSIDIAN_VAULT`, `TRIGLAV_KB_ROOTS`, `TRIGLAV_KB_RAG_CONFIG` (по умолчанию `~/knowledge/opencode-rag.json`).

## Состояние

- `~/.local/share/triglavcode/` — SQLite (`economics.db`, `calendar.db`), `triggers.json`, `triggers-state.json`, `media/`, `3d/`.
- Для семантического поиска по учебникам: отдельный workspace `~/knowledge` со своим `opencode-rag.json`
  (индексируется `cd ~/knowledge && opencode-rag index -y`), чтобы не переиндексировать весь home.
