/**
 * TriglavCode — мультиагентная оркестрация «бригада».
 *
 * Запускает последовательность специализированных субагентов (по умолчанию
 * аналитик → разработчик → тестировщик), передавая результат предыдущего
 * следующему. Роли — это агенты opencode (например ~/.config/opencode/agent/*.md).
 *
 * Env:
 *   TRIGLAV_BRIGADE=0     отключить
 *   TRIGLAV_BRIGADE_MAX   предохранитель на число ролей (по умолчанию 5)
 *
 * Инструмент: brigade_run
 */
import { tool } from "@opencode-ai/plugin"
import { createSession, promptSession, lastAssistantText } from "../_shared/tc.js"

const ENABLED = process.env.TRIGLAV_BRIGADE !== "0"
const MAX_ROLES = Number(process.env.TRIGLAV_BRIGADE_MAX) > 0 ? Number(process.env.TRIGLAV_BRIGADE_MAX) : 5

const ROLE_PROMPTS = {
  analyst:
    "Ты бизнес-/системный аналитик. Сформулируй требования, критерии приёмки, граничные случаи и риски. " +
    "Верни краткий структурированный результат (без воды), пригодный для разработчика.",
  developer:
    "Ты senior-разработчик. На основе требований предыдущей роли предложи реализацию: план изменений, ключевые файлы, " +
    "фрагменты кода и команды проверки. Учитывай существующий код проекта.",
  tester:
    "Ты QA-инженер. На основе требований и реализации составь и (если возможно) выполни проверки: тест-кейсы, " +
    "команды запуска, ожидаемые результаты. Найди дефекты и риски, дай вердикт готовности.",
  reviewer:
    "Ты строгий ревьюер. Проверь решение на корректность, безопасность, обработку ошибок и тесты. " +
    "Дай вердикт и список замечаний по приоритетам P0/P1/P2.",
}

function parseModel(value) {
  if (!value || typeof value !== "string") return undefined
  const idx = value.indexOf("/")
  if (idx <= 0) return undefined
  return { providerID: value.slice(0, idx), modelID: value.slice(idx + 1) }
}

function extractText(data) {
  if (!data) return ""
  if (typeof data === "string") return data
  const parts = data.parts ?? data.message?.parts ?? []
  return parts
    .filter((p) => p?.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim()
}

export default async ({ client }) => {
  return {
    tool: {
      brigade_run: tool({
        description:
          "Мультиагентная бригада: последовательно прогоняет задачу через роли (аналитик → разработчик → тестировщик и т.п.), " +
          "передавая контекст. Роли — агенты opencode (analyst/developer/tester/reviewer или свои).",
        args: {
          task: tool.schema.string().describe("Задача для бригады"),
          roles: tool.schema
            .array(tool.schema.string())
            .optional()
            .describe("Роли по порядку (по умолчанию: analyst, developer, tester)"),
          model: tool.schema.string().optional().describe("provider/model для всех ролей (иначе модель из агента)"),
          react: tool.schema.boolean().default(false).describe("Не используется: бригада всегда выполняет прогон"),
        },
        async execute(args, ctx) {
          if (!ENABLED) return "Бригада отключена (TRIGLAV_BRIGADE=0)"
          const roles = (args.roles && args.roles.length ? args.roles : ["analyst", "developer", "tester"]).slice(0, MAX_ROLES)
          const model = parseModel(args.model)
          let context = ""
          const report = []

          for (const role of roles) {
            const prompt = ROLE_PROMPTS[role] || `Ты специалист роли «${role}». Выполни свою часть задачи качественно.`
            const text = [
              prompt,
              "",
              `Задача: ${args.task}`,
              context ? `\nКонтекст предыдущих ролей:\n${context}` : "",
              "\nВерни результат, который передадут следующей роли.",
            ]
              .filter(Boolean)
              .join("\n")

            let sessionID
            try {
              const created = await createSession(client, {
                title: `${role}: ${args.task.slice(0, 50)}`,
                parentID: ctx.sessionID,
                directory: ctx.directory,
              })
              sessionID = created?.id
              if (!sessionID) throw new Error("не удалось создать сессию")
              const result = await promptSession(client, sessionID, {
                agent: role,
                model,
                parts: [{ type: "text", text }],
                directory: ctx.directory,
              })
              let out = extractText(result)
              if (!out) out = await lastAssistantText(client, sessionID, ctx.directory)
              if (!out) out = "(роль не вернула текст)"
              report.push({ role, sessionID, out })
              context += `\n## ${role}\n${out}\n`
            } catch (error) {
              report.push({ role, sessionID, out: `ОШИБКА: ${error?.message ?? error}` })
              context += `\n## ${role}\n(ошибка: ${error?.message ?? error})\n`
            }
          }

          const rendered = [
            `# Бригада: ${args.task}`,
            `Роли: ${roles.join(" → ")}`,
            "",
            ...report.map((r) => `## ${r.role}${r.sessionID ? ` (сессия ${r.sessionID})` : ""}\n${r.out}`),
          ].join("\n\n")
          return { title: "Brigade run", output: rendered }
        },
      }),
    },
  }
}
