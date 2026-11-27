import { randomBytes } from "node:crypto"

export type Ticket = {
  token: string
  createdAt: number
  expiresAt: number
  sessionID?: string
  usedAt?: number
}

export type RedeemResult =
  | { ok: true; ticket: Ticket }
  | { ok: false; reason: "not_found" | "expired" | "used" }

const DEFAULT_TTL_MS = 5 * 60 * 1000

// In-memory registry of one-time pairing links. It lives in the same process as
// the server started by `triglavcode pair`, so the CLI and the HTTP route share
// this map without any external storage.
const tickets = new Map<string, Ticket>()

export function create(input?: { ttlMs?: number; sessionID?: string }): Ticket {
  const now = Date.now()
  const ttl = input?.ttlMs && input.ttlMs > 0 ? input.ttlMs : DEFAULT_TTL_MS
  const ticket: Ticket = {
    token: randomBytes(32).toString("base64url"),
    createdAt: now,
    expiresAt: now + ttl,
    sessionID: input?.sessionID,
  }
  tickets.set(ticket.token, ticket)
  return ticket
}

export function redeem(token: string): RedeemResult {
  const ticket = tickets.get(token)
  if (!ticket) return { ok: false, reason: "not_found" }
  if (ticket.usedAt !== undefined) return { ok: false, reason: "used" }
  if (ticket.expiresAt <= Date.now()) {
    tickets.delete(token)
    return { ok: false, reason: "expired" }
  }
  ticket.usedAt = Date.now()
  return { ok: true, ticket }
}

export function peek(token: string): Ticket | undefined {
  return tickets.get(token)
}

export function reset() {
  tickets.clear()
}

export const Pair = { create, redeem, peek, reset, DEFAULT_TTL_MS }
