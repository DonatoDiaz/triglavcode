const DEFAULTS = { RUB: 90, CNY: 7.2 }

function rate(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function decimals(value: number): number {
  const abs = Math.abs(value)
  if (abs === 0) return 2
  if (abs < 0.1) return 4
  if (abs < 1) return 3
  return 2
}

/**
 * Format a USD cost as CNY + RUB (dollars are not shown).
 *
 * Rates default to static values; override with:
 *   TRIGLAV_USD_RUB  rubles per USD (default 90)
 *   TRIGLAV_USD_CNY  yuan per USD   (default 7.2)
 */
export function formatCost(usd: number, rates?: { RUB?: number; CNY?: number }): string {
  const value = Number.isFinite(usd) ? usd : 0
  const rub = value * (rates?.RUB ?? rate("TRIGLAV_USD_RUB", DEFAULTS.RUB))
  const cny = value * (rates?.CNY ?? rate("TRIGLAV_USD_CNY", DEFAULTS.CNY))
  return `¥${cny.toFixed(decimals(cny))} · ₽${rub.toFixed(decimals(rub))}`
}
