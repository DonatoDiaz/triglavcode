# TriglavCode для Windows — установщик

Один файл `TriglavCode-Setup-<версия>.exe` ставит TriglavCode в профиль
пользователя (без прав администратора), добавляет папку в `PATH` и создаёт
ярлыки в меню «Пуск» (и на рабочем столе по желанию).

Состав:

| Файл | Назначение |
| --- | --- |
| `triglavcode.iss` | Скрипт Inno Setup 6 — сам установщик |
| `triglavcode-launcher.cmd` | Ярлык запуска: открывает TUI в Windows Terminal (или в консоли) |
| `QUICKSTART.ru.txt` | «Быстрый старт», кладётся рядом с программой |
| `build-installer.ps1` | Сборка установщика на Windows |

## Сборка

На Windows (нужны [Bun 1.3.14](https://bun.sh) и Inno Setup 6):

```powershell
bun install
bun run --cwd packages/opencode script/build.ts --single --skip-install
pwsh ./installer/windows/build-installer.ps1 -Version 1.19.0-triglav.1
```

Результат: `installer/windows/dist/TriglavCode-Setup-1.19.0-triglav.1.exe`.

`build-installer.ps1` сам находит `ISCC.exe` (или ставит Inno Setup через
`winget`/`choco`).

## CI

Готовый workflow лежит в `triglav-release.workflow.yml`. Чтобы включить
автосборку, скопируйте его в репозиторий:

```bash
cp installer/windows/triglav-release.workflow.yml .github/workflows/triglav-release.yml
git add .github/workflows/triglav-release.yml
```

> Добавление файлов в `.github/workflows/` требует у токена/push-ключа права
> `workflow` у GitHub (иначе push отклоняется).

На `windows-latest` workflow собирает `triglavcode.exe`, затем установщик, и оба
файла (`TriglavCode-Setup-*.exe` и переносимый
`triglavcode-windows-x64-gui.zip`) попадают в GitHub Release.
Ручной запуск (`workflow_dispatch`) собирает артефакты без публикации релиза;
релиз публикуется по тегу `triglav-<версия>`.

## Что делает установщик

- Копирует `triglavcode.exe`, лаунчер, иконку и PDF-руководство.
- Добавляет папку установки в пользовательский `PATH` (запуск `triglavcode`
  из любого терминала) и убирает её при удалении.
- Создаёт ярлыки «Пуск → TriglavCode», «Быстрый старт», «Руководство», «Удалить».
- Регистрируется в «Приложения и возможности» со штатным деинсталлятором.
