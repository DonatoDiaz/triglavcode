/**
 * TriglavCode — событийные триггеры.
 *
 * Опрашивает источники (GitHub, произвольный JSON URL, локальный JSONL-инбокс)
 * и «проталкивает» новые события прямо в активную сессию агента. По умолчанию
 * сообщение добавляется без ответа модели (noReply); react=true — агент отвечает.
 *
 * Источники хранятся в $TRIGLAV_STATE_DIR/triggers.json (по умолчанию
 * ~/.local/share/triglavcode/triggers.json).
 *
 * Env:
 *   TRIGLAV_TRIGGERS=0            отключить фоновый опрос
 *   TRIGLAV_TRIGGER_TICK_MS       базовый тик проверки (по умолчанию 30000)
 *   GITHUB_TOKEN / GH_TOKEN       токен для GitHub API
 *
 * Инструменты: trigger_add, trigger_list, trigger_remove, trigger_poll
 */
import { tool } from "@opencode-ai/plugin"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"
import { STATE_DIR, ensureDir, inject, setLastSession, trackSession, clip } from "../_shared/tc.js"

const ENABLED = process.env.TRIGLAV_TRIGGERS !== "0"
const TICK = Number(process.env.TRIGLAV_TRIGGER_TICK_MS) > 0 ? Number(process.env.TRIGLAV_TRIGGER_TICK_MS) : 30000
const CONFIG = path.join(STATE_DIR, "triggers.json")
const STATE = path.join(STATE_DIR, "triggers-state.json")

function loadJson(file, fallback) {
  try {
    if (!existsSync(file)) return fallback
    return JSON.parse(readFileSync(file, "utf8"))
  } catch {
    return fallback
  }
}

function saveJson(file, value) {
  ensureDir()
  try {
    writeFileSync(file, JSON.stringify(value, null, 2))
  } catch (error) {
    console.error("[triglav-triggers] save failed:", error?.message ?? error)
  }
}

function sources() {
  const list = loadJson(CONFIG, [])
  return Array.isArray(list) ? list : []
}

function state() {
  const s = loadJson(STATE, {})
  if (!s.seen || typeof s.seen !== "object") s.seen = {}
  if (!s.lastPoll || typeof s.lastPoll !== "object") s.lastPoll = {}
  return s
}

function hash(text) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(16)
}

async function githubEvents(source) {
  const token = source.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "triglavcode-triggers" }
  if (token) headers.Authorization = `Bearer ${token}`
  const url = source.repo
    ? `https://api.github.com/repos/${source.repo}/events?per_page=30`
    : `https://api.github.com/notifications?all=false&per_page=20`
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`)
  const data = await response.json()
  const items = Array.isArray(data) ? data : []
  return items.map((item) => {
    if (source.repo) {
      return {
        id: item.id || hash(JSON.stringify(item)),
        text: `[GitHub] ${item.type || "event"} · ${item.actor?.login || "?"} в ${item.repo?.name || source.repo} (${item.created_at || ""})\n${item.payload?.ref || ""}`.trim(),
      }
    }
    return {
      id: item.id || item.node_id || hash(JSON.stringify(item)),
      text: `[GitHub] ${item.subject?.title || "(notification)"} · ${item.repository?.full_name || "?"} · reason: ${item.reason || "?"}\n${item.repository?.html_url || ""}`.trim(),
    }
  })
}

async function genericEvents(source) {
  const response = await fetch(source.url, { headers: { "User-Agent": "triglavcode-triggers" } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  const items = Array.isArray(data) ? data : data.events || data.items || data.notifications || [data]
  return items.slice(0, 20).map((item) => {
    const text = source.template
      ? String(source.template).replace(/\{(\w+)\}/g, (_, key) => (item && item[key] != null ? String(item[key]) : ""))
      : clip(item, 500)
    return { id: item?.id || item?.node_id || hash(JSON.stringify(item)), text: `[${source.name || "event"}] ${text}` }
  })
}

function fileEvents(source) {
  const file = source.path
  if (!file || !existsSync(file)) return []
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean)
  const seen = source._offset || 0
  const fresh = lines.slice(seen)
  source._offset = lines.length
  return fresh.slice(0, 20).map((line, i) => ({
    id: `${seen + i}:${hash(line)}`,
    text: `[${source.name || "inbox"}] ${clip(line, 500)}`,
  }))
}

async function pollSource(source, st, client) {
  const now = Date.now()
  const interval = Math.max(15, Number(source.interval) || 120) * 1000
  const last = st.lastPoll[source.id] || 0
  if (now - last < interval) return 0

  let events = []
  try {
    if (source.kind === "github") events = await githubEvents(source)
    else if (source.kind === "file") events = fileEvents(source)
    else events = await genericEvents(source)
  } catch (error) {
    console.error(`[triglav-triggers] ${source.name || source.kind} poll failed:`, error?.message ?? error)
    st.lastPoll[source.id] = now
    return 0
  }

  const seen = new Set(st.seen[source.id] || [])
  const fresh = []
  for (const event of events) {
    if (!event?.id || seen.has(event.id)) continue
    seen.add(event.id)
    fresh.push(event)
  }
  st.seen[source.id] = [...seen].slice(-200)
  st.lastPoll[source.id] = now

  if (!fresh.length) return 0
  const text = [
    `📡 События (${source.name || source.kind}) — ${fresh.length}:`,
    ...fresh.slice(0, 8).map((e) => `• ${e.text}`),
    fresh.length > 8 ? `… и ещё ${fresh.length - 8}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const ok = await inject(client, text, { react: Boolean(source.react) })
  return ok ? fresh.length : 0
}

async function pollAll(client, force = false) {
  const st = state()
  const list = sources()
  let injected = 0
  for (const source of list) {
    if (!source.enabled && source.enabled !== undefined) continue
    if (force) st.lastPoll[source.id] = 0
    injected += await pollSource(source, st, client)
  }
  saveJson(STATE, st)
  return injected
}

function normalizeSource(input) {
  const id = input.id || `src_${hash(JSON.stringify(input) + Date.now())}`
  return { ...input, id, enabled: input.enabled !== false }
}

export default async ({ client }) => {
  let timer

  if (ENABLED) {
    timer = setInterval(() => {
      void pollAll(client)
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
      trigger_add: tool({
        description:
          "Добавить источник событий. kind=github (notifications или repo events), generic (JSON URL), file (JSONL инбокс).",
        args: {
          kind: tool.schema.enum(["github", "generic", "file"]),
          name: tool.schema.string().optional(),
          repo: tool.schema.string().optional().describe("owner/repo для GitHub events"),
          url: tool.schema.string().optional().describe("URL для generic JSON"),
          path: tool.schema.string().optional().describe("Путь к JSONL для file"),
          token: tool.schema.string().optional().describe("GitHub токен (иначе env GITHUB_TOKEN)"),
          template: tool.schema.string().optional().describe("Шаблон текста для generic, {field}"),
          interval: tool.schema.number().default(120).describe("Интервал опроса, секунды (мин. 15)"),
          react: tool.schema.boolean().default(false).describe("true — агент отвечает на событие"),
        },
        async execute(args) {
          const list = sources()
          const source = normalizeSource({ ...args })
          list.push(source)
          saveJson(CONFIG, list)
          return `Источник добавлен: ${source.id} (${source.kind})`
        },
      }),
      trigger_list: tool({
        description: "Показать настроенные источники событий и статус.",
        args: {},
        async execute() {
          const list = sources()
          if (!list.length) return "Источников нет."
          const st = state()
          return list
            .map(
              (s) =>
                `${s.id} · ${s.kind}${s.repo ? ` (${s.repo})` : ""}${s.url ? ` ${s.url}` : ""}${s.path ? ` ${s.path}` : ""} · ` +
                `interval ${s.interval || 120}s · react=${Boolean(s.react)} · seen=${(st.seen[s.id] || []).length}`,
            )
            .join("\n")
        },
      }),
      trigger_remove: tool({
        description: "Удалить источник по id.",
        args: { id: tool.schema.string() },
        async execute(args) {
          const list = sources()
          const next = list.filter((s) => s.id !== args.id)
          if (next.length === list.length) return `Не найден: ${args.id}`
          saveJson(CONFIG, next)
          return `Удалён: ${args.id}`
        },
      }),
      trigger_poll: tool({
        description: "Опросить источники немедленно и протолкнуть новые события в сессию.",
        args: {},
        async execute(_args, ctx) {
          if (!ENABLED) return "Триггеры отключены (TRIGLAV_TRIGGERS=0)"
          if (ctx?.sessionID) setLastSession(ctx.sessionID)
          const count = await pollAll(client, true)
          return `Новых событий: ${count}. В сессию: ${count ? "доставлено" : "нет"}.`
        },
      }),
    },
  }
}
