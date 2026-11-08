/**
 * TriglavCode — календарь, задачи, напоминания и дедлайны.
 *
 * Хранит задачи/события/напоминания в SQLite и в фоне проталкивает напоминания
 * и предупреждения о дедлайнах в активную сессию агента.
 *
 * БД: $TRIGLAV_CALENDAR_DB или ~/.local/share/triglavcode/calendar.db
 * Env: TRIGLAV_CALENDAR=0 (отключить), TRIGLAV_CALENDAR_TICK_MS (по умолчанию 30000)
 *
 * Инструменты: cal_add, cal_list, cal_agenda, cal_done, cal_remove
 */
import { tool } from "@opencode-ai/plugin"
import { openDb, parseTime, fmt, setLastSession, trackSession, inject } from "../_shared/tc.js"

const ENABLED = process.env.TRIGLAV_CALENDAR !== "0"
const TICK = Number(process.env.TRIGLAV_CALENDAR_TICK_MS) > 0 ? Number(process.env.TRIGLAV_CALENDAR_TICK_MS) : 30000
let dbp

async function db() {
  if (!ENABLED) return undefined
  if (dbp) return dbp
  dbp = await openDb(process.env.TRIGLAV_CALENDAR_DB || "calendar.db")
  dbp.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'task',
    title TEXT NOT NULL,
    notes TEXT,
    due_at INTEGER,
    remind_at INTEGER,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'open',
    project TEXT,
    reminded INTEGER NOT NULL DEFAULT 0,
    due_warned INTEGER NOT NULL DEFAULT 0
  )`)
  return dbp
}

function rowLine(row) {
  const flags = []
  if (row.due_at) flags.push(`due ${fmt(row.due_at)}`)
  if (row.remind_at && !row.reminded) flags.push(`remind ${fmt(row.remind_at)}`)
  if (row.status === "done") flags.push("done")
  if (row.due_at && row.status !== "done" && row.due_at < Date.now()) flags.push("OVERDUE")
  return `#${row.id} [${row.kind}/${row.priority}] ${row.title}${row.project ? ` · ${row.project}` : ""}${
    flags.length ? ` — ${flags.join(", ")}` : ""
  }${row.notes ? `\n    ${row.notes}` : ""}`
}

async function tick(client) {
  const d = await db()
  if (!d) return
  const now = Date.now()
  const dueReminders = d
    .query(`SELECT * FROM items WHERE status='open' AND remind_at IS NOT NULL AND remind_at <= ? AND reminded = 0 ORDER BY remind_at`)
    .all(now)
  const dueDeadlines = d
    .query(`SELECT * FROM items WHERE status='open' AND due_at IS NOT NULL AND due_at <= ? AND due_warned = 0 ORDER BY due_at`)
    .all(now)

  if (!dueReminders.length && !dueDeadlines.length) return

  const lines = []
  for (const row of dueReminders) {
    lines.push(`⏰ Напоминание #${row.id}: ${row.title}${row.due_at ? ` (дедлайн ${fmt(row.due_at)})` : ""}`)
    d.run(`UPDATE items SET reminded = 1 WHERE id = ?`, [row.id])
  }
  for (const row of dueDeadlines) {
    lines.push(`⚠️ Дедлайн наступил для #${row.id}: ${row.title} (${fmt(row.due_at)})`)
    d.run(`UPDATE items SET due_warned = 1 WHERE id = ?`, [row.id])
  }
  if (lines.length) {
    await inject(client, `[Календарь TriglavCode]\n${lines.join("\n")}`, { react: false })
  }
}

export default async ({ client }) => {
  let timer
  if (ENABLED) {
    timer = setInterval(() => {
      void tick(client)
    }, TICK)
    if (typeof timer.unref === "function") timer.unref()
  }

  return {
    dispose: async () => {
      if (timer) clearInterval(timer)
    },
    "chat.message": async (input) => {
      if (input?.sessionID) setLastSession(input.sessionID)
    },
    event: async ({ event }) => {
      trackSession(event)
    },
    tool: {
      cal_add: tool({
        description:
          "Добавить задачу/событие/напоминание с дедлайном. Время: ISO, '2026-11-10 15:00', 'in 2h', '+1d', 'tomorrow'.",
        args: {
          title: tool.schema.string(),
          kind: tool.schema.enum(["task", "event", "reminder"]).default("task"),
          due: tool.schema.string().optional().describe("Дедлайн/время события"),
          remind: tool.schema.string().optional().describe("Когда напомнить (по умолчанию = due для reminder)"),
          priority: tool.schema.enum(["low", "normal", "high"]).default("normal"),
          notes: tool.schema.string().optional(),
          project: tool.schema.string().optional(),
        },
        async execute(args) {
          const d = await db()
          if (!d) return "Календарь отключён (TRIGLAV_CALENDAR=0)"
          const kind = args.kind || "task"
          const priority = args.priority || "normal"
          const dueAt = parseTime(args.due)
          let remindAt = parseTime(args.remind)
          if (!remindAt && kind === "reminder" && dueAt) remindAt = dueAt
          const info = d.run(
            `INSERT INTO items (created_at, kind, title, notes, due_at, remind_at, priority, project) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [Date.now(), kind, args.title, args.notes ?? null, dueAt, remindAt, priority, args.project ?? null],
          )
          const id = Number(info.lastInsertRowid)
          return `Добавлено #${id}: [${kind}/${priority}] ${args.title}${dueAt ? ` · due ${fmt(dueAt)}` : ""}${
            remindAt ? ` · remind ${fmt(remindAt)}` : ""
          }`
        },
      }),

      cal_list: tool({
        description: "Список задач/напоминаний.",
        args: {
          status: tool.schema.enum(["open", "done", "all"]).default("open"),
          project: tool.schema.string().optional(),
          limit: tool.schema.number().int().min(1).max(500).default(50),
        },
        async execute(args) {
          const d = await db()
          if (!d) return "Календарь отключён"
          const status = args.status || "open"
          const limit = Number(args.limit) || 50
          const where = []
          const params = []
          if (status !== "all") {
            where.push("status = ?")
            params.push(status)
          }
          if (args.project) {
            where.push("project = ?")
            params.push(args.project)
          }
          const sql = `SELECT * FROM items ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY COALESCE(due_at, remind_at, created_at) LIMIT ?`
          params.push(limit)
          const rows = d.query(sql).all(...params)
          if (!rows.length) return "Пусто."
          return rows.map(rowLine).join("\n")
        },
      }),

      cal_agenda: tool({
        description: "Повестка на ближайшие N дней + просроченные.",
        args: { days: tool.schema.number().int().min(1).max(365).default(7) },
        async execute(args) {
          const d = await db()
          if (!d) return "Календарь отключён"
          const now = Date.now()
          const days = Number(args.days) || 7
          const until = now + days * 86400000
          const rows = d
            .query(
              `SELECT * FROM items WHERE status='open' AND (
                 (due_at IS NOT NULL AND due_at <= ?) OR
                 (remind_at IS NOT NULL AND remind_at <= ?)
               ) ORDER BY COALESCE(due_at, remind_at)`,
            )
            .all(until, until)
          const overdue = rows.filter((r) => (r.due_at && r.due_at < now) || (r.remind_at && r.remind_at < now))
          const upcoming = rows.filter((r) => !overdue.includes(r))
          return [
            `Повестка на ${days} дн.`,
            overdue.length ? "\nПросрочено:\n" + overdue.map(rowLine).join("\n") : "",
            upcoming.length ? "\nСкоро:\n" + upcoming.map(rowLine).join("\n") : "",
            !rows.length ? "Пусто." : "",
          ]
            .filter(Boolean)
            .join("\n")
        },
      }),

      cal_done: tool({
        description: "Отметить задачу выполненной.",
        args: { id: tool.schema.number().int() },
        async execute(args) {
          const d = await db()
          if (!d) return "Календарь отключён"
          d.run(`UPDATE items SET status='done' WHERE id = ?`, [args.id])
          return `#${args.id} отмечено выполненным.`
        },
      }),

      cal_remove: tool({
        description: "Удалить задачу по id.",
        args: { id: tool.schema.number().int() },
        async execute(args) {
          const d = await db()
          if (!d) return "Календарь отключён"
          d.run(`DELETE FROM items WHERE id = ?`, [args.id])
          return `#${args.id} удалено.`
        },
      }),
    },
  }
}
