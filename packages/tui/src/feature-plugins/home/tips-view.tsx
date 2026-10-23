import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, For, type Accessor } from "solid-js"
import { DEFAULT_THEMES, useTheme } from "../../context/theme"
import { useCommandShortcut } from "../../keymap"

const themeCount = Object.keys(DEFAULT_THEMES).length

type TipPart = { text: string; highlight: boolean }
type TipShortcut = Accessor<string>
type Shortcuts = {
  agentCycle: TipShortcut
  childFirst: TipShortcut
  childNext: TipShortcut
  childPrevious: TipShortcut
  commandList: TipShortcut
  editorOpen: TipShortcut
  helpShow: TipShortcut
  inputClear: TipShortcut
  inputNewline: TipShortcut
  inputPaste: TipShortcut
  inputUndo: TipShortcut
  leader: TipShortcut
  messagesCopy: TipShortcut
  messagesFirst: TipShortcut
  messagesLast: TipShortcut
  messagesPageDown: TipShortcut
  messagesPageUp: TipShortcut
  messagesToggleConceal: TipShortcut
  modelCycleRecent: TipShortcut
  modelList: TipShortcut
  sessionExport: TipShortcut
  sessionInterrupt: TipShortcut
  sessionList: TipShortcut
  sessionNew: TipShortcut
  sessionParent: TipShortcut
  sessionPinToggle: TipShortcut
  sessionQuickSwitch1: TipShortcut
  sessionQuickSwitch9: TipShortcut
  sessionSidebarToggle: TipShortcut
  sessionTimeline: TipShortcut
  statusView: TipShortcut
  terminalSuspend: TipShortcut
  themeList: TipShortcut
}
type Tip = string | ((shortcuts: Shortcuts) => string | undefined)

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = []
  const regex = /\{highlight\}(.*?)\{\/highlight\}/g
  const found = Array.from(tip.matchAll(regex))
  const state = found.reduce(
    (acc, match) => {
      const start = match.index ?? 0
      if (start > acc.index) {
        acc.parts.push({ text: tip.slice(acc.index, start), highlight: false })
      }
      acc.parts.push({ text: match[1], highlight: true })
      acc.index = start + match[0].length
      return acc
    },
    { parts, index: 0 },
  )

  if (state.index < tip.length) {
    parts.push({ text: tip.slice(state.index), highlight: false })
  }

  return parts
}

const NO_MODELS_TIP = "Выполните {highlight}/connect{/highlight}, чтобы добавить ИИ-провайдера и начать работу"
const NO_MODELS_PARTS = parse(NO_MODELS_TIP)

function shortcutText(value: string) {
  return `{highlight}${value}{/highlight}`
}

function commandText(command: string, shortcut: string) {
  if (!shortcut) return shortcutText(command)
  return `${shortcutText(command)} или ${shortcutText(shortcut)}`
}

function press(shortcut: string, text: string) {
  if (!shortcut) return undefined
  return `Нажмите ${shortcutText(shortcut)} ${text}`
}

function configShortcut(api: TuiPluginApi, command: string): TipShortcut {
  return () =>
    api.tuiConfig.keybinds
      .get(command)
      .map((binding) => api.keys.formatSequence(Array.from(api.keymap.parseKeySequence(binding.key))))
      .filter(Boolean)
      .join(", ")
}

export function Tips(props: { api: TuiPluginApi; connected?: boolean }) {
  const theme = useTheme().theme
  const tipOffset = Math.random()
  const shortcuts: Shortcuts = {
    agentCycle: useCommandShortcut("agent.cycle"),
    childFirst: configShortcut(props.api, "session.child.first"),
    childNext: configShortcut(props.api, "session.child.next"),
    childPrevious: configShortcut(props.api, "session.child.previous"),
    commandList: useCommandShortcut("command.palette.show"),
    editorOpen: useCommandShortcut("prompt.editor"),
    helpShow: useCommandShortcut("help.show"),
    inputClear: useCommandShortcut("prompt.clear"),
    inputNewline: useCommandShortcut("input.newline"),
    inputPaste: useCommandShortcut("prompt.paste"),
    inputUndo: useCommandShortcut("input.undo"),
    leader: configShortcut(props.api, "leader"),
    messagesCopy: configShortcut(props.api, "messages.copy"),
    messagesFirst: configShortcut(props.api, "session.first"),
    messagesLast: configShortcut(props.api, "session.last"),
    messagesPageDown: configShortcut(props.api, "session.page.down"),
    messagesPageUp: configShortcut(props.api, "session.page.up"),
    messagesToggleConceal: configShortcut(props.api, "session.toggle.conceal"),
    modelCycleRecent: useCommandShortcut("model.cycle_recent"),
    modelList: useCommandShortcut("model.list"),
    sessionExport: configShortcut(props.api, "session.export"),
    sessionInterrupt: configShortcut(props.api, "session.interrupt"),
    sessionList: useCommandShortcut("session.list"),
    sessionNew: useCommandShortcut("session.new"),
    sessionParent: configShortcut(props.api, "session.parent"),
    sessionPinToggle: configShortcut(props.api, "session.pin.toggle"),
    sessionQuickSwitch1: useCommandShortcut("session.quick_switch.1"),
    sessionQuickSwitch9: useCommandShortcut("session.quick_switch.9"),
    sessionSidebarToggle: configShortcut(props.api, "session.sidebar.toggle"),
    sessionTimeline: configShortcut(props.api, "session.timeline"),
    statusView: useCommandShortcut("opencode.status"),
    terminalSuspend: useCommandShortcut("terminal.suspend"),
    themeList: useCommandShortcut("theme.switch"),
  }
  const tip = createMemo(() => {
    if (props.connected === false) return NO_MODELS_TIP
    const tips = [...TIPS, process.platform !== "win32" ? TERMINAL_SUSPEND_TIP : INPUT_UNDO_TIP].flatMap((item) => {
      const value = typeof item === "string" ? item : item(shortcuts)
      return value ? [value] : []
    })
    return tips[Math.floor(tipOffset * tips.length)] ?? NO_MODELS_TIP
  }, NO_MODELS_TIP)
  // Solid can expose a memo's initial value while a pure computation is pending.
  const parts = createMemo(() => {
    const value = tip()
    if (typeof value === "string") return parse(value)
    return NO_MODELS_PARTS
  }, NO_MODELS_PARTS)

  return (
    <box flexDirection="row" maxWidth="100%">
      <text flexShrink={0} style={{ fg: theme.warning }}>
        ● Совет{" "}
      </text>
      <text flexShrink={1} wrapMode="word">
        <For each={parts()}>
          {(part) => <span style={{ fg: part.highlight ? theme.text : theme.textMuted }}>{part.text}</span>}
        </For>
      </text>
    </box>
  )
}

const TIPS: Tip[] = [
  "Введите {highlight}@{/highlight} и имя файла для нечёткого поиска и прикрепления файлов",
  "Начните сообщение с {highlight}!{/highlight}, чтобы выполнять команды shell (например, {highlight}!ls -la{/highlight})",
  (shortcuts) => press(shortcuts.agentCycle(), "чтобы переключаться между агентами Build и Plan"),
  "Используйте {highlight}/undo{/highlight}, чтобы отменить последнее сообщение и изменения файлов",
  "Используйте {highlight}/redo{/highlight}, чтобы вернуть отменённые сообщения и изменения файлов",
  "Выполните {highlight}/share{/highlight}, чтобы создать публичную ссылку opencode.ai",
  "Перетащите изображения или PDF в терминал как контекст",
  (shortcuts) => press(shortcuts.inputPaste(), "чтобы вставить изображения из буфера обмена в запрос"),
  (shortcuts) => `Use ${commandText("/editor", shortcuts.editorOpen())} для составления сообщений во внешнем редакторе`,
  "Выполните {highlight}/init{/highlight}, чтобы автоматически создать правила проекта по вашей кодовой базе",
  (shortcuts) => `Use ${commandText("/models", shortcuts.modelList())} для переключения между доступными ИИ-моделями`,
  (shortcuts) => `Use ${commandText("/themes", shortcuts.themeList())} для переключения между встроенными темами (${themeCount})`,
  (shortcuts) => `Use ${commandText("/new", shortcuts.sessionNew())} чтобы начать новую сессию`,
  (shortcuts) => `Use ${commandText("/sessions", shortcuts.sessionList())} чтобы просматривать, закреплять и продолжать сессии`,
  (shortcuts) => press(shortcuts.sessionPinToggle(), "в списке сессий, чтобы закрепить её сверху"),
  (shortcuts) =>
    shortcuts.sessionQuickSwitch1() && shortcuts.sessionQuickSwitch9()
      ? `Use ${shortcutText(shortcuts.sessionQuickSwitch1())} through ${shortcutText(shortcuts.sessionQuickSwitch9())} для переключения закреплённых сессий`
      : undefined,
  "Выполните {highlight}/compact{/highlight}, чтобы сжать длинные сессии при приближении к лимиту контекста",
  (shortcuts) => `Use ${commandText("/export", shortcuts.sessionExport())} чтобы сохранить разговор в Markdown`,
  (shortcuts) => press(shortcuts.messagesCopy(), "чтобы скопировать последнее сообщение ассистента"),
  (shortcuts) => press(shortcuts.commandList(), "чтобы увидеть все доступные действия и команды"),
  "Выполните {highlight}/connect{/highlight}, чтобы добавить API-ключи для 75+ поддерживаемых провайдеров LLM",
  (shortcuts) => `Ведущая клавиша — ${shortcutText(shortcuts.leader())}; сочетайте с другими клавишами для быстрых действий`,
  (shortcuts) => press(shortcuts.modelCycleRecent(), "чтобы быстро переключаться между недавними моделями"),
  (shortcuts) => press(shortcuts.sessionSidebarToggle(), "в сессии, чтобы показать или скрыть боковую панель"),
  (shortcuts) =>
    shortcuts.messagesPageUp() && shortcuts.messagesPageDown()
      ? `Use ${shortcutText(shortcuts.messagesPageUp())}/${shortcutText(shortcuts.messagesPageDown())} для навигации по истории разговора`
      : undefined,
  (shortcuts) => press(shortcuts.messagesFirst(), "чтобы перейти к началу разговора"),
  (shortcuts) => press(shortcuts.messagesLast(), "чтобы перейти к последнему сообщению"),
  (shortcuts) => press(shortcuts.inputNewline(), "чтобы добавить переносы строк в запросе"),
  (shortcuts) => press(shortcuts.inputClear(), "во время ввода, чтобы очистить поле"),
  (shortcuts) => press(shortcuts.sessionInterrupt(), "чтобы остановить ИИ посреди ответа"),
  "Переключитесь на агента {highlight}Plan{/highlight} для предложений без изменений",
  "Используйте {highlight}@agent-name{/highlight} в запросах для вызова специализированных субагентов",
  (shortcuts) => {
    const items = [
      shortcuts.sessionParent(),
      shortcuts.childFirst(),
      shortcuts.childPrevious(),
      shortcuts.childNext(),
    ].filter(Boolean)
    if (!items.length) return undefined
    return `Use ${items.map(shortcutText).join(" / ")} для родительских/дочерних сессий`
  },
  "Создайте {highlight}opencode.json{/highlight} для настроек сервера и {highlight}tui.json{/highlight} для TUI",
  "Поместите настройки TUI в {highlight}~/.config/opencode/tui.json{/highlight} для глобальной конфигурации",
  "Добавьте {highlight}$schema{/highlight} в конфиг для автодополнения в редакторе",
  "Укажите {highlight}model{/highlight} в конфиге, чтобы задать модель по умолчанию",
  "Переопределяйте сочетания в {highlight}tui.json{/highlight} через секцию {highlight}keybinds{/highlight}",
  "Установите сочетание в {highlight}none{/highlight}, чтобы полностью отключить его",
  "Настраивайте локальные и удалённые MCP-серверы в секции {highlight}mcp{/highlight}",
  "Добавляйте {highlight}.md{/highlight} в {highlight}.opencode/commands/{/highlight} для переиспользуемых запросов",
  "Используйте {highlight}$ARGUMENTS{/highlight}, {highlight}$1{/highlight}, {highlight}$2{/highlight} в своих командах для динамического ввода",
  "Используйте обратные кавычки для вставки вывода shell (например, {highlight}`git status`{/highlight})",
  "Добавляйте {highlight}.md{/highlight} в {highlight}.opencode/agents/{/highlight} для специализированных ИИ-персон",
  "Настраивайте права по агентам для инструментов {highlight}edit{/highlight}, {highlight}bash{/highlight} и {highlight}webfetch{/highlight}",
  'Используйте шаблоны вроде {highlight}"git *": "allow"{/highlight} для точечных прав bash',
  'Установите {highlight}"rm -rf *": "deny"{/highlight}, чтобы блокировать разрушительные команды',
  'Настройте {highlight}"git push": "ask"{/highlight}, чтобы требовать подтверждение перед push',
  'Установите {highlight}"formatter": true{/highlight}, чтобы включить встроенные форматтеры',
  'Установите {highlight}"formatter": false{/highlight}, чтобы отключить унаследованные форматтеры',
  "Определяйте свои команды форматирования с расширениями файлов в конфиге",
  'Установите {highlight}"lsp": true{/highlight}, чтобы включить встроенный LSP-анализ кода',
  "Создавайте {highlight}.ts{/highlight} в {highlight}.opencode/tools/{/highlight}, чтобы определять новые инструменты LLM",
  "Определения инструментов могут вызывать скрипты на Python, Go и др.",
  "Добавляйте {highlight}.ts{/highlight} в {highlight}.opencode/plugins/{/highlight} для хуков событий",
  "С помощью плагинов отправляйте уведомления ОС по завершении сессий",
  "Создайте плагин, запрещающий TriglavCode читать конфиденциальные файлы",
  "Используйте {highlight}triglavcode run{/highlight} для неинтерактивных скриптов",
  "Используйте {highlight}triglavcode --continue{/highlight}, чтобы продолжить последнюю сессию",
  "Используйте {highlight}triglavcode run -f file.ts{/highlight}, чтобы прикреплять файлы через CLI",
  "Используйте {highlight}--format json{/highlight} для машиночитаемого вывода в скриптах",
  "Выполните {highlight}triglavcode serve{/highlight} для headless-доступа к API TriglavCode",
  "Используйте {highlight}triglavcode run --attach{/highlight}, чтобы подключиться к запущенному серверу",
  "Выполните {highlight}triglavcode upgrade{/highlight}, чтобы обновиться до последней версии",
  "Выполните {highlight}triglavcode auth list{/highlight}, чтобы увидеть всех настроенных провайдеров",
  "Выполните {highlight}triglavcode agent create{/highlight} для пошагового создания агента",
  "Используйте {highlight}/opencode{/highlight} в GitHub issues/PR для запуска ИИ-действий",
  "Выполните {highlight}triglavcode github install{/highlight}, чтобы настроить GitHub workflow",
  "Комментируйте {highlight}/opencode fix this{/highlight} в issues для автосоздания PR",
  "Комментируйте {highlight}/oc{/highlight} на строках кода PR для точечных ревью",
  'Используйте {highlight}"theme": "system"{/highlight}, чтобы подстроиться под цвета терминала',
  "Создавайте JSON-файлы тем в каталоге {highlight}.opencode/themes/{/highlight}",
  "Темы поддерживают тёмный и светлый варианты для обоих режимов",
  "Используйте числовые коды цветов xterm 0-255 в JSON темы",
  "Используйте {highlight}{env:VAR_NAME}{/highlight} для переменных окружения в конфиге",
  "Используйте {highlight}{file:path}{/highlight}, чтобы включать содержимое файлов в значения конфига",
  "Используйте {highlight}instructions{/highlight} в конфиге для загрузки дополнительных файлов правил",
  "Задайте {highlight}temperature{/highlight} агента от 0.0 (сфокусированно) до 1.0 (креативно)",
  "Настройте {highlight}steps{/highlight}, чтобы ограничить число итераций агента на запрос",
  'Установите {highlight}"tools": {"bash": false}{/highlight}, чтобы отключить отдельные инструменты',
  'Установите {highlight}"mcp_*": false{/highlight}, чтобы отключить все инструменты MCP-сервера',
  "Переопределяйте глобальные настройки инструментов для каждого агента",
  'Установите {highlight}"share": "auto"{/highlight}, чтобы автоматически публиковать все сессии',
  'Установите {highlight}"share": "disabled"{/highlight}, чтобы запретить публикацию сессий',
  "Выполните {highlight}/unshare{/highlight}, чтобы убрать сессию из публичного доступа",
  "Разрешение {highlight}doom_loop{/highlight} предотвращает бесконечные циклы вызовов инструментов",
  "Разрешение {highlight}external_directory{/highlight} защищает файлы вне проекта",
  "Выполните {highlight}triglavcode debug config{/highlight} для диагностики конфигурации",
  "Используйте флаг {highlight}--print-logs{/highlight}, чтобы видеть подробные логи в stderr",
  (shortcuts) => `Use ${commandText("/timeline", shortcuts.sessionTimeline())} чтобы перейти к конкретным сообщениям`,
  (shortcuts) => press(shortcuts.messagesToggleConceal(), "чтобы переключать видимость блоков кода в сообщениях"),
  (shortcuts) => `Use ${commandText("/status", shortcuts.statusView())} чтобы увидеть статус системы`,
  "Включите {highlight}scroll_acceleration{/highlight} в {highlight}tui.json{/highlight} для плавной прокрутки",
  (shortcuts) =>
    shortcuts.commandList()
      ? `Переключение имени пользователя в чате через палитру команд (${shortcutText(shortcuts.commandList())})`
      : "Переключайте отображение имени пользователя в чате через палитру команд",
  "Запустите {highlight}docker run -it --rm ghcr.io/anomalyco/opencode{/highlight} в контейнере",
  "Используйте {highlight}/connect{/highlight} с OpenCode Zen для проверенных моделей",
  "Закоммитьте {highlight}AGENTS.md{/highlight} проекта в Git, чтобы делиться с командой",
  "Используйте {highlight}/review{/highlight} для ревью незакоммиченных изменений, веток или PR",
  (shortcuts) => `Use ${commandText("/help", shortcuts.helpShow())} чтобы открыть справку`,
  "Используйте {highlight}/rename{/highlight}, чтобы переименовать текущую сессию",
]

const INPUT_UNDO_TIP: Tip = (shortcuts) => press(shortcuts.inputUndo(), "to undo changes in your prompt")
const TERMINAL_SUSPEND_TIP: Tip = (shortcuts) =>
  press(shortcuts.terminalSuspend(), "to suspend the terminal and return to your shell")
