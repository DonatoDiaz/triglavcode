/**
 * TriglavCode — контроль делегирования (субагенты).
 *
 * Перехватывает вызовы инструмента `task` (запуск субагента) и не даёт
 * превысить лимиты: общий конкурентный и на сессию. При превышении — блокирует
 * вызов с понятной ошибкой.
 *
 * Env:
 *   TRIGLAV_MAX_SUBAGENTS             общий конкурентный лимит (по умолчанию 3; 0 = без лимита)
 *   TRIGLAV_MAX_SUBAGENTS_PER_SESSION лимит на сессию (по умолчанию 2; 0 = без лимита)
 *   TRIGLAV_DELEGATION=0              отключить
 *
 * Инструмент: delegation_status
 */
import { tool } from "@opencode-ai/plugin"

const ENABLED = process.env.TRIGLAV_DELEGATION !== "0"
const MAX = num(process.env.TRIGLAV_MAX_SUBAGENTS, 3)
const PER = num(process.env.TRIGLAV_MAX_SUBAGENTS_PER_SESSION, 2)

function num(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

const active = new Map()
let total = 0
let spawned = 0
let blocked = 0

function sessionCount(id) {
  return active.get(id) || 0
}

function statusText() {
  const rows = [...active.entries()].filter(([, n]) => n > 0)
  const per = rows.length ? rows.map(([id, n]) => `  ${id}: ${n}`).join("\n") : "  (нет активных)"
  return [
    `Делегирование: ${ENABLED ? "включено" : "отключено"}`,
    `Лимит общий: ${MAX === 0 ? "∞" : MAX} · на сессию: ${PER === 0 ? "∞" : PER}`,
    `Активно сейчас: ${total} · запущено всего: ${spawned} · заблокировано: ${blocked}`,
    "Активные задачи по сессиям:",
    per,
  ].join("\n")
}

export default async () => {
  return {
    tool: {
      delegation_status: tool({
        description: "Показать статус делегирования субагентов (активные, лимиты, блокировки).",
        args: {},
        async execute() {
          return statusText()
        },
      }),
    },
    "tool.execute.before": async (input) => {
      if (!ENABLED || input.tool !== "task") return
      const sid = input.sessionID || "global"
      const current = sessionCount(sid)
      const overTotal = MAX > 0 && total >= MAX
      const overSession = PER > 0 && current >= PER
      if (overTotal || overSession) {
        blocked++
        const reason = overTotal ? `общий лимит ${MAX}` : `лимит сессии ${PER}`
        throw new Error(
          `Делегирование заблокировано (${reason}). Активно ${total}, в этой сессии ${current}. ` +
            `Дождитесь завершения субагентов или повысьте TRIGLAV_MAX_SUBAGENTS / ` +
            `TRIGLAV_MAX_SUBAGENTS_PER_SESSION.`,
        )
      }
      active.set(sid, current + 1)
      total++
      spawned++
    },
    "tool.execute.after": async (input) => {
      if (!ENABLED || input.tool !== "task") return
      const sid = input.sessionID || "global"
      const current = sessionCount(sid)
      if (current > 0) active.set(sid, current - 1)
      total = Math.max(0, total - 1)
    },
    event: async ({ event }) => {
      // safety: when a session goes idle, drop any leaked per-session count
      const type = event?.type || event?.properties?.type
      if (!ENABLED || type !== "session.idle") return
      const p = event?.properties ?? event?.data ?? {}
      const sid = p.sessionID || p.info?.id || p.id
      if (typeof sid !== "string") return
      const current = sessionCount(sid)
      if (current > 0) {
        total = Math.max(0, total - current)
        active.set(sid, 0)
      }
    },
  }
}
