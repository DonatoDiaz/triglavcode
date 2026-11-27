import { beforeEach, describe, expect, test } from "bun:test"
import { Pair } from "../../src/server/pair"

describe("Pair", () => {
  beforeEach(() => Pair.reset())

  test("creates a url-safe one-time token with a TTL", () => {
    const ticket = Pair.create({ ttlMs: 60_000, sessionID: "ses_123" })
    expect(ticket.token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(ticket.token.length).toBeGreaterThanOrEqual(32)
    expect(ticket.sessionID).toBe("ses_123")
    expect(ticket.expiresAt).toBeGreaterThan(ticket.createdAt)
    expect(Pair.peek(ticket.token)).toEqual(ticket)
  })

  test("redeems a token exactly once", () => {
    const ticket = Pair.create()
    const first = Pair.redeem(ticket.token)
    expect(first.ok).toBe(true)
    const second = Pair.redeem(ticket.token)
    expect(second).toEqual({ ok: false, reason: "used" })
  })

  test("rejects unknown tokens", () => {
    expect(Pair.redeem("does-not-exist")).toEqual({ ok: false, reason: "not_found" })
  })

  test("rejects expired tokens", async () => {
    const ticket = Pair.create({ ttlMs: 1 })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(Pair.redeem(ticket.token)).toEqual({ ok: false, reason: "expired" })
  })

  test("defaults to a five minute TTL", () => {
    const ticket = Pair.create()
    expect(ticket.expiresAt - ticket.createdAt).toBe(Pair.DEFAULT_TTL_MS)
    expect(Pair.DEFAULT_TTL_MS).toBe(5 * 60 * 1000)
  })
})
