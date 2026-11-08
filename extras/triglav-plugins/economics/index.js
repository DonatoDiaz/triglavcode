/**
 * TriglavCode — экономический плагин (project economics).
 *
 * Учёт доходов/расходов проекта + оценка стоимости по токенам и сводка
 * фактических затрат из analytics.db (usage-analytics).
 *
 * БД: $TRIGLAV_ECON_DB или ~/.local/share/triglavcode/economics.db
 * Отключить: TRIGLAV_ECON=0
 *
 * Инструменты: econ_entry, econ_summary, econ_token_estimate, econ_report
 */
import { tool } from "@opencode-ai/plugin"
import { homedir } from "node:os"
import path from "node:path"
import { openDb } from "../_shared/tc.js"
import { getRates, money } from "../_shared/rates.js"

const ENABLED = process.env.TRIGLAV_ECON !== "0"
const DB_NAME = process.env.TRIGLAV_ECON_DB || "economics.db"
const ANALYTICS_DB =
  process.env.TRIGLAV_ANALYTICS_DB || path.join(homedir(), ".local", "share", "triglavcode", "analytics.db")

let cached

async function db() {
  if (!ENABLED) return undefined
  if (cached) return cached
  cached = await openDb(DB_NAME)
  cached.run(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    project TEXT,
    kind TEXT NOT NULL,
    category TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    note TEXT
  )`)
  cached.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`)
  return cached
}

// Дефолтные цены, USD за 1M токенов (можно переопределить аргументами).
const PRICES = {
  "deepseek-v4-flash": { in: 0.15, out: 0.6 },
  "deepseek-v4-flash-0731": { in: 0.15, out: 0.6 },
  "deepseek-v4.1-flash": { in: 0.15, out: 0.6 },
  "deepseek-v4-pro": { in: 0.6, out: 2.2 },
  "deepseek-v4-flash-vision-exp": { in: 0.15, out: 0.6 },
  "deepseek-chat": { in: 0.27, out: 1.1 },
  "gpt-4o": { in: 2.5, out: 10 },
  "claude": { in: 3, out: 15 },
  "qwen": { in: 0, out: 0 },
  "ollama": { in: 0, out: 0 },
}

function priceFor(model) {
  if (!model) return { in: 0, out: 0, matched: false }
  const key = Object.keys(PRICES)
    .sort((a, b) => b.length - a.length)
    .find((k) => model.toLowerCase().includes(k))
  return key ? { ...PRICES[key], matched: true } : { in: 0, out: 0, matched: false }
}

function toUSD(amount, currency, rates) {
  const value = Number(amount) || 0
  const cur = (currency || "USD").toUpperCase()
  if (cur === "USD") return value
  if (cur === "RUB") return value / (rates?.RUB || 90)
  if (cur === "CNY") return value / (rates?.CNY || 7.2)
  return value
}

function line(label, usd, rates) {
  return `${label}: $${usd.toFixed(usd !== 0 && Math.abs(usd) < 1 ? 4 : 2)}  (${money(usd, rates)})`
}

function fmtCur(usd, currency, rates) {
  const cur = (currency || "USD").toUpperCase()
  if (cur === "RUB") return `₽${(usd * (rates?.RUB || 90)).toFixed(2)}`
  if (cur === "CNY") return `¥${(usd * (rates?.CNY || 7.2)).toFixed(2)}`
  return `$${usd.toFixed(2)}`
}

function setting(d, key, fallback) {
  try {
    const row = d.query(`SELECT value FROM settings WHERE key = ?`).get(key)
    return row ? JSON.parse(row.value) : fallback
  } catch {
    return fallback
  }
}

function putSetting(d, key, value) {
  d.run(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, [
    key,
    JSON.stringify(value),
  ])
}

function tokenCostUsd(tin, tout, model, priceIn, priceOut) {
  const auto = priceFor(model)
  const pin = priceIn ?? auto.in
  const pout = priceOut ?? auto.out
  return ((Number(tin) || 0) / 1_000_000) * pin + ((Number(tout) || 0) / 1_000_000) * pout
}

export default async () => {
  return {
    tool: {
      econ_entry: tool({
        description:
          "Добавить доход или расход проекта в экономический журнал. amount + currency; kind=income|expense.",
        args: {
          kind: tool.schema.enum(["income", "expense"]).describe("Тип записи"),
          amount: tool.schema.number().describe("Сумма"),
          currency: tool.schema.string().default("USD").describe("Валюта: USD|RUB|CNY"),
          category: tool.schema.string().optional().describe("Категория (сервер, реклама, подписка...)"),
          note: tool.schema.string().optional().describe("Комментарий"),
          project: tool.schema.string().optional().describe("Проект (по умолчанию — все)"),
        },
        async execute(args) {
          const d = await db()
          if (!d) return "Экономический плагин отключён (TRIGLAV_ECON=0)"
          d.run(
            `INSERT INTO entries (ts, project, kind, category, amount, currency, note) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              Date.now(),
              args.project ?? null,
              args.kind,
              args.category ?? null,
              args.amount,
              (args.currency || "USD").toUpperCase(),
              args.note ?? null,
            ],
          )
          return `Записано: ${args.kind} ${args.amount} ${(args.currency || "USD").toUpperCase()}${
            args.category ? ` · ${args.category}` : ""
          }`
        },
      }),

      econ_summary: tool({
        description: "Сводка доходов/расходов/баланса по проекту (конвертация в USD, CNY, RUB).",
        args: {
          project: tool.schema.string().optional().describe("Фильтр по проекту"),
        },
        async execute(args) {
          const d = await db()
          if (!d) return "Экономический плагин отключён (TRIGLAV_ECON=0)"
          const rows = args.project
            ? d.query(`SELECT kind, category, amount, currency FROM entries WHERE project = ?`).all(args.project)
            : d.query(`SELECT kind, category, amount, currency FROM entries`).all()
          const rates = await getRates()
          let income = 0
          let expense = 0
          const byCat = new Map()
          for (const row of rows) {
            const usd = toUSD(row.amount, row.currency, rates)
            if (row.kind === "income") income += usd
            else expense += usd
            const cat = row.category || "(без категории)"
            byCat.set(cat, (byCat.get(cat) || 0) + (row.kind === "income" ? usd : -usd))
          }
          const balance = income - expense
          const lines = [
            `Проект: ${args.project || "все"}`,
            line("Доходы", income, rates),
            line("Расходы", expense, rates),
            line("Баланс", balance, rates),
            "",
            "По категориям (net USD):",
            ...[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => `  ${c}: $${v.toFixed(2)}`),
          ]
          return lines.join("\n")
        },
      }),

      econ_token_estimate: tool({
        description:
          "Оценить стоимость генерации по токенам. Цены — USD за 1M токенов; модель ищется в таблице, можно задать вручную.",
        args: {
          input_tokens: tool.schema.number().default(0).describe("Входные токены"),
          output_tokens: tool.schema.number().default(0).describe("Выходные токены"),
          model: tool.schema.string().optional().describe("Имя модели (для автоцены)"),
          price_in: tool.schema.number().optional().describe("Цена за 1M входных, USD"),
          price_out: tool.schema.number().optional().describe("Цена за 1M выходных, USD"),
        },
        async execute(args) {
          const tin = Number(args.input_tokens) || 0
          const tout = Number(args.output_tokens) || 0
          const auto = priceFor(args.model)
          const pin = args.price_in ?? auto.in
          const pout = args.price_out ?? auto.out
          const usd = (tin / 1_000_000) * pin + (tout / 1_000_000) * pout
          const rates = await getRates()
          const totalTokens = tin + tout
          return [
            `Модель: ${args.model || "(не указана)"}${auto.matched ? " · цена из таблицы" : ""}`,
            `Токены: ${totalTokens} (in ${tin} / out ${tout})`,
            `Цены: $${pin}/1M in · $${pout}/1M out`,
            line("Оценка", usd, rates),
            `На 1M токенов (средн.): $${totalTokens ? (usd / totalTokens) * 1_000_000 : 0}`,
          ].join("\n")
        },
      }),

      econ_report: tool({
        description:
          "Комбинированный отчёт: ручные доходы/расходы + фактические затраты на токены из analytics.db.",
        args: {
          project: tool.schema.string().optional(),
        },
        async execute(args) {
          const d = await db()
          const rates = await getRates()
          const lines = []
          if (d) {
            const rows = args.project
              ? d.query(`SELECT kind, amount, currency FROM entries WHERE project = ?`).all(args.project)
              : d.query(`SELECT kind, amount, currency FROM entries`).all()
            let income = 0
            let expense = 0
            for (const row of rows) {
              const usd = toUSD(row.amount, row.currency, rates)
              if (row.kind === "income") income += usd
              else expense += usd
            }
            lines.push(line("Доходы (ручные)", income, rates))
            lines.push(line("Расходы (ручные)", expense, rates))
          }
          try {
            const { Database } = await import("bun:sqlite")
            const analytics = new Database(ANALYTICS_DB, { readonly: true })
            const row = analytics
              .query(`SELECT COUNT(*) n, COALESCE(SUM(input),0) i, COALESCE(SUM(output),0) o, COALESCE(SUM(cost),0) c FROM usage`)
              .get()
            analytics.close()
            lines.push("")
            lines.push(`Фактические токены: ${row.n} сообщений, in ${row.i}, out ${row.o}`)
            lines.push(line("Затраты на токены (факт)", Number(row.c) || 0, rates))
          } catch {
            lines.push("")
            lines.push("analytics.db недоступен — фактическую стоимость токенов посчитать нельзя.")
          }
          return lines.join("\n")
        },
      }),
      econ_settings: tool({
        description: "Просмотр/настройка дефолтов: ставка за час, валюта, накладные %, маржа %, налог %.",
        args: {
          rate: tool.schema.number().optional(),
          currency: tool.schema.string().optional(),
          overhead_pct: tool.schema.number().optional(),
          margin_pct: tool.schema.number().optional(),
          tax_pct: tool.schema.number().optional(),
        },
        async execute(args) {
          const d = await db()
          if (!d) return "Экономический плагин отключён (TRIGLAV_ECON=0)"
          if (args.rate !== undefined) putSetting(d, "rate", Number(args.rate))
          if (args.currency !== undefined) putSetting(d, "currency", String(args.currency).toUpperCase())
          if (args.overhead_pct !== undefined) putSetting(d, "overhead_pct", Number(args.overhead_pct))
          if (args.margin_pct !== undefined) putSetting(d, "margin_pct", Number(args.margin_pct))
          if (args.tax_pct !== undefined) putSetting(d, "tax_pct", Number(args.tax_pct))
          const defaults = {
            rate: setting(d, "rate", 30),
            currency: setting(d, "currency", "USD"),
            overhead_pct: setting(d, "overhead_pct", 15),
            margin_pct: setting(d, "margin_pct", 40),
            tax_pct: setting(d, "tax_pct", 0),
          }
          return "Настройки экономики:\n" + Object.entries(defaults).map(([k, v]) => `  ${k}: ${v}`).join("\n")
        },
      }),

      econ_project_cost: tool({
        description: "Себестоимость проекта: труд (часы×ставка) + токены + инфраструктура + прочее + накладные.",
        args: {
          hours: tool.schema.number().default(0),
          rate: tool.schema.number().optional().describe("Ставка за час (в валюте currency)"),
          currency: tool.schema.string().optional(),
          token_input: tool.schema.number().default(0),
          token_output: tool.schema.number().default(0),
          model: tool.schema.string().optional(),
          price_in: tool.schema.number().optional(),
          price_out: tool.schema.number().optional(),
          infra: tool.schema.number().default(0),
          other: tool.schema.number().default(0),
          overhead_pct: tool.schema.number().optional(),
        },
        async execute(args) {
          const d = await db()
          const rates = await getRates()
          const currency = (args.currency || setting(d, "currency", "USD")).toUpperCase()
          const rate = args.rate ?? setting(d, "rate", 30)
          const hours = Number(args.hours) || 0
          const laborUsd = toUSD(hours * rate, currency, rates)
          const tokens = tokenCostUsd(args.token_input, args.token_output, args.model, args.price_in, args.price_out)
          const infra = toUSD(Number(args.infra) || 0, currency, rates)
          const other = toUSD(Number(args.other) || 0, currency, rates)
          const subtotal = laborUsd + tokens + infra + other
          const overheadPct = args.overhead_pct ?? setting(d, "overhead_pct", 15)
          const overhead = (subtotal * overheadPct) / 100
          const total = subtotal + overhead
          return [
            `Себестоимость проекта (валюта ${currency})`,
            `Труд: ${hours} ч × ${rate} = ${fmtCur(laborUsd, currency, rates)}`,
            `Токены: ${fmtCur(tokens, currency, rates)}`,
            `Инфраструктура: ${fmtCur(infra, currency, rates)}`,
            `Прочее: ${fmtCur(other, currency, rates)}`,
            `Накладные ${overheadPct}%: ${fmtCur(overhead, currency, rates)}`,
            `ИТОГО себестоимость: ${fmtCur(total, currency, rates)}`,
          ].join("\n")
        },
      }),

      econ_quote: tool({
        description:
          "Коммерческое предложение заказчику: себестоимость + маржа + скидка + налог, тарифы economy/standard/premium и условия.",
        args: {
          hours: tool.schema.number().default(0),
          rate: tool.schema.number().optional(),
          currency: tool.schema.string().optional(),
          token_input: tool.schema.number().default(0),
          token_output: tool.schema.number().default(0),
          model: tool.schema.string().optional(),
          price_in: tool.schema.number().optional(),
          price_out: tool.schema.number().optional(),
          infra: tool.schema.number().default(0),
          other: tool.schema.number().default(0),
          overhead_pct: tool.schema.number().optional(),
          margin_pct: tool.schema.number().optional(),
          tax_pct: tool.schema.number().optional(),
          discount_pct: tool.schema.number().default(0),
          client: tool.schema.string().optional(),
          project: tool.schema.string().optional(),
          support_hours: tool.schema.number().default(0),
          revisions: tool.schema.number().default(2),
        },
        async execute(args) {
          const d = await db()
          const rates = await getRates()
          const currency = (args.currency || setting(d, "currency", "USD")).toUpperCase()
          const rate = args.rate ?? setting(d, "rate", 30)
          const hours = Number(args.hours) || 0
          const laborUsd = toUSD(hours * rate, currency, rates)
          const tokens = tokenCostUsd(args.token_input, args.token_output, args.model, args.price_in, args.price_out)
          const infra = toUSD(Number(args.infra) || 0, currency, rates)
          const other = toUSD(Number(args.other) || 0, currency, rates)
          const subtotal = laborUsd + tokens + infra + other
          const overhead = (subtotal * (args.overhead_pct ?? setting(d, "overhead_pct", 15))) / 100
          const cost = subtotal + overhead
          const marginPct = args.margin_pct ?? setting(d, "margin_pct", 40)
          const taxPct = args.tax_pct ?? setting(d, "tax_pct", 0)
          const discountPct = Number(args.discount_pct) || 0
          const priceBefore = cost * (1 + marginPct / 100)
          const discount = (priceBefore * discountPct) / 100
          const net = priceBefore - discount
          const tax = (net * taxPct) / 100
          const total = net + tax
          const profit = net - cost
          const tier = (m) => cost * (1 + m / 100) * (1 + taxPct / 100)
          return [
            `Коммерческое предложение${args.client ? ` для ${args.client}` : ""}${args.project ? ` · ${args.project}` : ""}`,
            "",
            `Себестоимость: ${fmtCur(cost, currency, rates)}`,
            `  труд ${hours}ч × ${rate}: ${fmtCur(laborUsd, currency, rates)}`,
            `  токены: ${fmtCur(tokens, currency, rates)}`,
            `  инфраструктура: ${fmtCur(infra, currency, rates)}`,
            `  прочее: ${fmtCur(other, currency, rates)}`,
            `  накладные: ${fmtCur(overhead, currency, rates)}`,
            "",
            `Маржа ${marginPct}%: +${fmtCur(profit, currency, rates)}`,
            discountPct ? `Скидка ${discountPct}%: -${fmtCur(discount, currency, rates)}` : "",
            `Цена без налога: ${fmtCur(net, currency, rates)}`,
            taxPct ? `Налог ${taxPct}%: +${fmtCur(tax, currency, rates)}` : "",
            `ИТОГО к оплате: ${fmtCur(total, currency, rates)}`,
            "",
            `Тарифы: economy ${fmtCur(tier(20), currency, rates)} · standard ${fmtCur(tier(40), currency, rates)} · premium ${fmtCur(tier(70), currency, rates)}`,
            `Условия: ${args.revisions} раунда правок, поддержка ${args.support_hours} ч, предоплата 50%.`,
          ]
            .filter(Boolean)
            .join("\n")
        },
      }),
    },
  }
}
