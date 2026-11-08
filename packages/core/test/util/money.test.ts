import { describe, expect, test } from "bun:test"
import { formatCost } from "../../src/util/money"

describe("formatCost", () => {
  test("converts USD to CNY and RUB with explicit rates", () => {
    expect(formatCost(1.5, { RUB: 95, CNY: 7.3 })).toBe("¥10.95 · ₽142.50")
  })

  test("uses more precision for small amounts", () => {
    expect(formatCost(0.0012, { RUB: 95, CNY: 7.3 })).toBe("¥0.0088 · ₽0.114")
  })

  test("formats zero without dollars", () => {
    expect(formatCost(0, { RUB: 95, CNY: 7.3 })).toBe("¥0.00 · ₽0.00")
  })

  test("reads rates from the environment", () => {
    const previous = { RUB: process.env.TRIGLAV_USD_RUB, CNY: process.env.TRIGLAV_USD_CNY }
    process.env.TRIGLAV_USD_RUB = "100"
    process.env.TRIGLAV_USD_CNY = "8"
    try {
      expect(formatCost(2)).toBe("¥16.00 · ₽200.00")
    } finally {
      process.env.TRIGLAV_USD_RUB = previous.RUB
      process.env.TRIGLAV_USD_CNY = previous.CNY
    }
  })

  test("never renders a dollar sign", () => {
    expect(formatCost(123.456, { RUB: 90, CNY: 7.2 })).not.toContain("$")
  })
})
