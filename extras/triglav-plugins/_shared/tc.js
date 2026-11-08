/**
 * TriglavCode — shared helpers for local plugins.
 *
 * Holds a process-wide "last active session" so background features (reminders,
 * event triggers) can inject messages into the session the user is working in.
 * Also bridges the v1 (nested path/body) and v2 (flattened) SDK client shapes.
 */
import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"

export const STATE_DIR =
  process.env.TRIGLAV_STATE_DIR || path.join(homedir(), ".local", "share", "triglavcode")

export function ensureDir(dir = STATE_DIR) {
  mkdirSync(dir, { recursive: true })
  return dir
}

export async function openDb(name) {
  ensureDir()
  const { Database } = await import("bun:sqlite")
  return new Database(path.join(ensureDir(), name), { create: true })
}

export function clip(value, max) {
  const text = typeof value === "string" ? value : JSON.stringify(value)
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function fmt(ts) {
  if (!ts) return "—"
  return new Date(ts).toISOString().replace("T", " ").slice(0, 16)
}

const UNITS = {
  s: 1000,
  sec: 1000,
  m: 60000,
  min: 60000,
  h: 3600000,
  hr: 3600000,
  d: 86400000,
  day: 86400000,
  w: 604800000,
  week: 604800000,
}

/** Parse "in 2h", "+30m", "2026-11-10 15:00", "2026-11-10", epoch ms. */
export function parseTime(input, base = Date.now()) {
  if (input === undefined || input === null || input === "") return null
  if (typeof input === "number" && Number.isFinite(input)) return input
  const raw = String(input).trim().toLowerCase()
  if (raw === "now") return base
  if (raw === "today") return new Date(new Date(base).toDateString()).getTime()
  if (raw === "tomorrow") return new Date(new Date(base).toDateString()).getTime() + 86400000
  const rel = raw.match(/^(?:\+|in\s+)?(\d+(?:\.\d+)?)\s*([a-z]+)$/)
  if (rel && UNITS[rel[2]]) return base + Number(rel[1]) * UNITS[rel[2]]
  const iso = Date.parse(String(input).replace(" ", "T"))
  if (!Number.isNaN(iso)) return iso
  const plain = Date.parse(String(input))
  return Number.isNaN(plain) ? null : plain
}

// --- last active session ---------------------------------------------------
let lastSession = null
export function setLastSession(id) {
  if (typeof id === "string" && id) lastSession = id
}
export function getLastSession() {
  return lastSession
}
export function trackSession(event) {
  const p = event?.properties ?? event?.data ?? {}
  if (typeof p.parentID === "string" && p.parentID) return
  if (p.info?.parentID) return
  setLastSession(p.sessionID || p.info?.id || p.id)
}

// --- SDK bridge (v1 nested vs v2 flattened) --------------------------------
function pickData(result) {
  if (result && typeof result === "object" && "data" in result && result.data !== undefined) return result.data
  return result
}

export async function createSession(client, { title, parentID, directory } = {}) {
  const body = { ...(title ? { title } : {}), ...(parentID ? { parentID } : {}) }
  try {
    const r = await client.session.create({
      body,
      ...(directory ? { query: { directory } } : {}),
    })
    const data = pickData(r)
    if (data?.id) return data
  } catch {}
  try {
    const r = await client.session.create({ ...body, ...(directory ? { directory } : {}) })
    return pickData(r)
  } catch {
    return undefined
  }
}

export async function promptSession(client, id, { agent, model, parts, noReply, directory } = {}) {
  const body = {
    parts: parts ?? [],
    ...(agent ? { agent } : {}),
    ...(model ? { model } : {}),
    ...(noReply !== undefined ? { noReply } : {}),
  }
  try {
    const r = await client.session.prompt({
      path: { id },
      body,
      ...(directory ? { query: { directory } } : {}),
    })
    if (r?.error) throw r.error
    return pickData(r)
  } catch {
    try {
      const r = await client.session.prompt({ sessionID: id, ...body, ...(directory ? { directory } : {}) })
      if (r?.error) throw r.error
      return pickData(r)
    } catch {
      return undefined
    }
  }
}

export async function promptAsyncSession(client, id, { agent, model, parts, noReply, directory } = {}) {
  const body = {
    parts: parts ?? [],
    ...(agent ? { agent } : {}),
    ...(model ? { model } : {}),
    ...(noReply !== undefined ? { noReply } : {}),
  }
  try {
    return await client.session.promptAsync({
      path: { id },
      body,
      ...(directory ? { query: { directory } } : {}),
    })
  } catch {
    try {
      return await client.session.promptAsync({ sessionID: id, ...body, ...(directory ? { directory } : {}) })
    } catch {
      return undefined
    }
  }
}

export async function messagesSession(client, id, directory) {
  try {
    const r = await client.session.messages({
      path: { id },
      ...(directory ? { query: { directory } } : {}),
    })
    return pickData(r) ?? []
  } catch {
    try {
      const r = await client.session.messages({ sessionID: id, ...(directory ? { directory } : {}) })
      return pickData(r) ?? []
    } catch {
      return []
    }
  }
}

/** Push a message into a session (default: no model reply). */
export async function inject(client, text, { sessionID, react = false, directory } = {}) {
  const id = sessionID || lastSession
  if (!id || !client?.session?.promptAsync) return false
  const result = await promptAsyncSession(client, id, {
    parts: [{ type: "text", text }],
    noReply: !react,
    directory,
  })
  return result !== undefined
}

/** Extract the last assistant text from a session's messages. */
export async function lastAssistantText(client, id, directory) {
  const items = await messagesSession(client, id, directory)
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (item?.info?.role !== "assistant") continue
    const text = (item.parts ?? [])
      .filter((part) => part?.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim()
    if (text) return text
  }
  return ""
}
