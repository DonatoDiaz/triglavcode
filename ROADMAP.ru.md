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

## В работе / планируется
- [ ] Автообновление данных (список провайдеров/моделей/статус) — low priority
- [ ] Уточнить пресеты провайдеров под TriglavCode (при необходимости)
- [ ] Проверка GUI-сборки при появлении доступа к @solidjs/start

## Принципы
- Минимальный diff относительно upstream, без изменения ключей совместимости
- Русский язык для пользовательского интерфейса
- Только surface-брендинг
- Фокус на работоспособности локального fallback
