# TriglavCode — baseline (Фаза 1)

- **Дата:** 2026-10-23
- **База:** opencode `v1.18.29` (`16747470f976aca3d362ad730bcd3fe82ecc2c9a`)
- **Ветка:** `triglav`
- **Окружение:** bun `1.4.2`, node `v25.8.2`, gcc `15.2.1`, linux-x64

## Установка

`bun install`: 2342 пакета, **1 ошибка** —

```
@solidjs/start@https://pkg.pr.new/@solidjs/start@dfb2020: ConnectionClosed
```

Влияет только на `packages/app` (веб-UI). URL доступен через `curl` (HTTP/2 200), падает именно загрузчик bun.
CLI собирается и работает без этого пакета.

## Сборка

```bash
OPENCODE_VERSION=1.18.29 bun run --cwd packages/opencode script/build.ts \
  --single --skip-install --skip-embed-web-ui
```

- Бинарь: `packages/opencode/dist/opencode-linux-x64/bin/opencode` (**143 MB**)
- `--version` → `1.18.29`

## Проверки

| Проверка | Результат |
| --- | --- |
| typecheck `packages/opencode` | pass |
| typecheck `packages/core` | pass |
| lint (root `oxlint`) | **1 error** (pre-existing), 4902 warnings |
| test `packages/opencode` | **3571 pass / 22 skip / 1 todo / 0 fail** (254 файла, 279 с) |

Lint-ошибка (upstream, файл не менялся):

```
packages/session-ui/src/v2/components/prompt-input/index.tsx:163
'0'-prefixed octal literals and octal escape sequences are deprecated
(\200B в Tailwind-классе empty:before:content-)
```

## Фаза 2 — брендинг (проверка)

| Проверка | Результат |
| --- | --- |
| typecheck `packages/tui` + `packages/opencode` | pass |
| lint (root `oxlint`) | 1 error (та же upstream), 4902 warnings |
| test `packages/opencode` | **3562 pass / 22 skip / 1 todo / 0 fail** (254 файла, 285 с) |
| test `packages/tui` | **193 pass / 1 skip / 0 fail** (45 файлов, 5.4 с) |
| сборка | `dist/triglavcode-linux-x64/bin/triglavcode`, `--version` = `1.18.29-triglav.1` |

- Удалены 9 неактуальных тестов `installation` (self-update отключён, см. ниже);
  остальные 3 проверяют отключённое поведение и определение метода установки.
- Help-снапшоты перегенерированы: 64 строки (`opencode <cmd>` → `triglavcode <cmd>`).
- Self-update выключен: `TRIGLAV_SELF_UPDATE=1` — единственный способ включить.
  `latest()` возвращает текущую версию (без сети), `upgrade()` падает с
  `UpgradeFailedError("Self-update is disabled in TriglavCode builds...")`.
- GUI-тема не проверена сборкой: web-UI недоступен из-за `@solidjs/start`.

## Известные отличия от релизной сборки

- web-UI не вшит (`--skip-embed-web-ui`) — из-за недоступного `@solidjs/start`
- single-target сборка, без вариантов baseline/musl/других архитектур
- версия задаётся через `OPENCODE_VERSION`; иначе канал берётся из имени ветки
  и получается preview-версия вида `0.0.0-triglav-<timestamp>`

## Тулчейн сборки (важно)

Собирать **только Bun 1.3.14** (`packageManager`). С Bun 1.4.2 `Bun.build`
(`splitting: true` + `minify: true`) теряет экспорт одного из сервисов
`locationServices`, и при старте сессии падает
`TypeError: undefined is not an object (evaluating 'node.name')`
в `rewriteReplacementDependencies` (`layer-node.ts`) из `SystemPrompt.environment`.

Проверенная команда:

```
cd packages/opencode
OPENCODE_VERSION=1.18.29-triglav.1 ~/.bun/bin/bun run script/build.ts \
  --single --skip-install --skip-embed-web-ui
```

- Бинарь, собранный 1.3.14, проходит end-to-end: `triglavcode run "Reply PONG"` → `PONG`,
  free tier работает, `booting location services` без ошибок.
- Проверять LLM из исходников (`bun run src/index.ts`) нельзя: `InstallationVersion = "local"`
  → UA `opencode/local` → free tier отвечает
  `OpenCode's free tier can only be used from within OpenCode...`.
  Для smoke-тестов использовать только собранный бинарь.
