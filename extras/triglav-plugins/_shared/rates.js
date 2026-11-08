/**
 * Shared USD → RUB/CNY conversion for TriglavCode plugins.
 *
 * Provider cost is stored in USD. Display is converted to CNY + RUB.
 * Live rates: https://open.er-api.com (cached 6h), fallback to defaults.
 *
 * Env overrides (skip live fetch when both set):
 *   TRIGLAV_USD_RUB   rubles per USD (default 90)
 *   TRIGLAV_USD_CNY   yuan per USD   (default 7.2)
 */
const FALLBACK = { RUB: 90, CNY: 7.2 }
let state = { at: 0, RUB: FALLBACK.RUB, CNY: FALLBACK.CNY, live: false }
let pending

function env(name) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : undefined
}

export async function getRates() {
  const rub = env("TRIGLAV_USD_RUB")
  const cny = env("TRIGLAV_USD_CNY")
  if (rub && cny) {
    state = { at: Date.now(), RUB: rub, CNY: cny, live: false }
    return state
  }
  if (state.at && Date.now() - state.at < 6 * 60 * 60 * 1000) return state
  if (!pending) {
    pending = fetchRates(rub, cny).finally(() => {
      pending = undefined
    })
  }
  return pending
}

async function fetchRates(rub, cny) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3500)
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal })
    if (response.ok) {
      const data = await response.json()
      state = {
        at: Date.now(),
        RUB: rub ?? (Number(data?.rates?.RUB) || FALLBACK.RUB),
        CNY: cny ?? (Number(data?.rates?.CNY) || FALLBACK.CNY),
        live: true,
      }
      return state
    }
  } catch {
  } finally {
    clearTimeout(timer)
  }
  state = { at: Date.now(), RUB: rub ?? FALLBACK.RUB, CNY: cny ?? FALLBACK.CNY, live: false }
  return state
}

export function convert(usd, rates) {
  const value = Number(usd) || 0
  return { rub: value * (rates?.RUB ?? FALLBACK.RUB), cny: value * (rates?.CNY ?? FALLBACK.CNY) }
}

function decimals(value) {
  const abs = Math.abs(value)
  if (abs === 0) return 2
  if (abs < 0.1) return 4
  if (abs < 1) return 3
  return 2
}

export function money(usd, rates) {
  const { rub, cny } = convert(usd, rates)
  return `¥${cny.toFixed(decimals(cny))} · ₽${rub.toFixed(decimals(rub))}`
}

export function current() {
  return state
}
