---
description: git commit and push
model: opencode/kimi-k2.5
subtask: true
---

commit and push

make sure it includes a prefix like
docs:
tui:
core:
ci:
ignore:
wip:

For anything in the packages/web use the docs: prefix.

prefer to explain WHY something was done from an end user perspective instead of
WHAT was done.

do not do generic messages like "improved agent experience" be very specific
about what user facing changes were made

if there are conflicts DO NOT FIX THEM. notify me and I will fix them

## Hygiene gate (выполни ДО коммита)

Проверь staged diff по чек-листу. Если что-то найдено — НЕ коммить, остановись и сообщи:

- Секреты и ключи: `.env`, api-токены, пароли, приватные ключи
- Отладочный мусор: `console.log`, `debugger`, `print()`
- Конфликтные маркеры: `<<<<<<<`, `=======`, `>>>>>>>`
- Болванки: `TODO`, `FIXME`, зашитые пути `/path/to/`, `example.com`
- Лишние бинарники и сгенерированный мусор (dist, node_modules, .cache)
- AI-слоп и неаккуратности стиля (см. `/rmslop` при необходимости)

## GIT DIFF

!`git diff`

## GIT DIFF --cached

!`git diff --cached`

## GIT STATUS --short

!`git status --short`
