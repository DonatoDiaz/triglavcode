# ROADMAP TriglavCode

## Выполнено (v1.18.29-triglav.1)
- [x] Форк opencode v1.18.29 → TriglavCode, поверхностный ребрендинг
- [x] Бинарник `triglavcode`, ASCII-вордмарк, тёмная тема Triglav
- [x] Русификация TUI и CLI (пользовательские строки)
- [x] Отключён self-update (только `TRIGLAV_SELF_UPDATE=1`)
- [x] README.ru.md, NOTICE.ru.md
- [x] Сохранена совместимость с opencode-rag (`app="opencode"`, `OPENCODE_*`)
- [x] Локальные модели Ollama + tool calling (fallback): `qwen2.5:latest`, `qwen2.5-coder-64k`, `qwen2.5-coder:7b`
- [x] Сравнительная таблица TriglavCode vs OpenCode
- [x] Встроенные команды-guardrails: `vet-skill` (security pipeline), `heal` (цикл авто-починки), `review` (gated PR review), hygiene-gate в `commit`
- [x] `parallel` (параллельный запуск подзадач), `complexity` (оценка сложности), `weekly` (ретро уроков сессий)
- [x] `tooling` (репутационный индекс скиллов + `.opencode/tooling-index.json`)
- [x] `bin/triglav-router` — авто-fallback: основной провайдер недоступен → `ollama/qwen2.5:latest`
- [x] Нативный fallback в бинаре (`TRIGLAV_FALLBACK_MODEL`), проверено end-to-end
- [x] TUI: `F2` — переключение облако/локально + индикатор `●` локальной модели
- [x] CI: `.github/workflows/triglav-release.yml` (сборка релизов Linux/macOS/Windows) — файл готов локально; пуш отложен (нужен scope `workflow` у OAuth-токена)

## В работе / планируется
- [ ] Автообновление данных (список провайдеров/моделей/статус) — low priority
- [ ] Уточнить пресеты провайдеров под TriglavCode (при необходимости)
- [ ] Проверка GUI-сборки при появлении доступа к @solidjs/start
- [ ] `vet-skill`: sandbox/vault-исполнение сторонних скиллов (паритет с Hermes; пока только статический аудит)
- [ ] Авто-close GitHub issues при мерже PR (паритет с Hermes)
- [ ] Отдельный systematic-debugger скилл рядом с `/heal` (паритет с Hermes)

## Принципы
- Минимальный diff относительно upstream, без изменения ключей совместимости
- Русский язык для пользовательского интерфейса
- Только surface-брендинг
- Фокус на работоспособности локального fallback
