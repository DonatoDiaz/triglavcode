/**
 * TriglavCode — генератор тестовых данных (fixtures/mocks).
 *
 * Генерирует реалистичные фикстуры из описания схемы (JSON) или прямо из
 * SQLite-таблицы (PRAGMA table_info). Форматы: json | sql | csv | python.
 * Детерминированно при заданном seed.
 *
 * Инструмент: generate_fixtures
 */
import { tool } from "@opencode-ai/plugin"
import { randomUUID } from "node:crypto"
import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"

const FIRST = ["Александр", "Мария", "Иван", "Елена", "Дмитрий", "Ольга", "Сергей", "Анна", "Павел", "Ксения", "Ravi", "Chloe", "Marco", "Yuki", "Liam"]
const LAST = ["Иванов", "Петрова", "Смирнов", "Кузнецова", "Попов", "Соколова", "Волков", "Морозова", "Nguyen", "Silva", "Müller", "Kim", "Rossi"]
const DOMAINS = ["example.com", "mail.test", "corp.local", "inbox.dev", "acme.io"]
const CITIES = ["Москва", "Санкт-Петербург", "Казань", "Новосибирск", "Berlin", "Lisbon", "Tokyo", "Toronto"]
const COUNTRIES = ["RU", "DE", "PT", "JP", "CA", "US", "BR"]
const COMPANIES = ["Acme LLC", "Globex", "Initech", "Umbrella", "Soylent", "Hooli", "Vandelay"]
const STREETS = ["Ленина", "Мира", "Садовая", "Центральная", "Main St", "Oak Ave", "Pine Rd"]
const WORDS = ["alpha", "beta", "gamma", "delta", "secure", "cloud", "data", "smart", "fast", "core", "pixel", "nova", "flux", "orbit"]
const STATUS = ["active", "pending", "inactive", "archived", "failed", "success"]
const ROLES = ["admin", "user", "manager", "viewer", "editor"]
const TYPES = ["standard", "premium", "trial", "internal"]

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function int(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function float(rng, min, max, decimals = 2) {
  const value = rng() * (max - min) + min
  return Number(value.toFixed(decimals))
}

function dateStr(rng, withTime) {
  const start = Date.UTC(2019, 0, 1)
  const end = Date.UTC(2027, 0, 1)
  const ts = int(rng, start, end)
  const iso = new Date(ts).toISOString()
  return withTime ? iso.replace("T", " ").slice(0, 19) : iso.slice(0, 10)
}

function sentence(rng, words = 6) {
  const parts = Array.from({ length: words }, () => pick(rng, WORDS))
  return parts.join(" ").replace(/^./, (c) => c.toUpperCase()) + "."
}

function baseType(type) {
  const t = String(type || "").toLowerCase()
  if (/int/.test(t)) return "int"
  if (/(real|float|double|numeric|decimal)/.test(t)) return "float"
  if (/(bool)/.test(t)) return "bool"
  if (/(date|time)/.test(t)) return "date"
  if (/(json|blob)/.test(t)) return "json"
  return "text"
}

function valueFor(rng, name, type) {
  const n = String(name || "").toLowerCase()
  const t = baseType(type)
  if (n === "id" || n.endsWith("_id") || n === "pk") {
    if (n.includes("uuid") || n.endsWith("guid")) return randomUUID()
    return int(rng, 1, 100000)
  }
  if (n.includes("uuid") || n === "guid") return randomUUID()
  if (n.includes("email") || n.includes("e_mail")) return `${pick(rng, FIRST).toLowerCase()}.${pick(rng, LAST).toLowerCase()}${int(rng, 1, 99)}@${pick(rng, DOMAINS)}`
  if (n.includes("firstname") || n.includes("first_name")) return pick(rng, FIRST)
  if (n.includes("lastname") || n.includes("last_name")) return pick(rng, LAST)
  if (n === "name" || n.includes("full_name") || n.includes("fullname")) return `${pick(rng, FIRST)} ${pick(rng, LAST)}`
  if (n.includes("username") || n.includes("handle") || n.includes("login")) return `${pick(rng, WORDS)}${int(rng, 1, 999)}`
  if (n.includes("phone") || n.includes("mobile")) return `+7 9${int(rng, 10, 99)} ${int(rng, 100, 999)}-${int(rng, 10, 99)}-${int(rng, 10, 99)}`
  if (n.includes("company") || n.includes("organization") || n.includes("org")) return pick(rng, COMPANIES)
  if (n.includes("city")) return pick(rng, CITIES)
  if (n.includes("country_code")) return pick(rng, COUNTRIES)
  if (n.includes("country")) return pick(rng, CITIES.concat(COUNTRIES))
  if (n.includes("address") || n.includes("street")) return `${pick(rng, STREETS)}, ${int(rng, 1, 200)}`
  if (n.includes("zip") || n.includes("postal")) return String(int(rng, 100000, 999999))
  if (n.includes("url") || n.includes("website") || n.includes("link")) return `https://${pick(rng, DOMAINS)}/${pick(rng, WORDS)}`
  if (n.includes("ip")) return `${int(rng, 1, 223)}.${int(rng, 0, 255)}.${int(rng, 0, 255)}.${int(rng, 1, 254)}`
  if (n.includes("age")) return int(rng, 18, 80)
  if (/(price|amount|cost|salary|balance|total|revenue|sum)/.test(n)) return float(rng, 1, 100000)
  if (/(qty|quantity|count|number|stock|views)/.test(n)) return int(rng, 1, 1000)
  if (n.startsWith("is_") || n.startsWith("has_") || n.includes("active") || n.includes("enabled") || n.includes("verified")) return rng() > 0.5
  if (n.includes("status") || n.includes("state")) return pick(rng, STATUS)
  if (n.includes("role")) return pick(rng, ROLES)
  if (n.includes("type") || n.includes("kind") || n.includes("category")) return pick(rng, TYPES)
  if (n.includes("password") || n.includes("secret") || n.includes("token") || n.includes("hash")) {
    return Array.from({ length: 24 }, () => "0123456789abcdef"[int(rng, 0, 15)]).join("")
  }
  if (n.includes("created") || n.includes("updated") || n.includes("_at") || n.includes("timestamp")) return dateStr(rng, true)
  if (n.includes("date") || n.includes("birth")) return dateStr(rng, false)
  if (n.includes("title") || n.includes("subject")) return sentence(rng, 4)
  if (n.includes("description") || n.includes("notes") || n.includes("comment") || n.includes("bio")) return sentence(rng, 8)
  if (t === "int") return int(rng, 1, 1000)
  if (t === "float") return float(rng, 0, 1000)
  if (t === "bool") return rng() > 0.5
  if (t === "date") return dateStr(rng, true)
  if (t === "json") return {}
  return pick(rng, WORDS)
}

function normalizeSchema(schema) {
  if (!schema || typeof schema !== "object") return {}
  if (schema.entities && typeof schema.entities === "object") return schema.entities
  if (schema.table && schema.fields) return { [schema.table]: schema.fields }
  if (Array.isArray(schema)) return { items: Object.fromEntries(schema.map((f) => [String(f), "text"])) }
  const entries = Object.entries(schema)
  const isEntityMap = entries.length > 0 && entries.every(([, v]) => v && typeof v === "object" && !Array.isArray(v))
  if (isEntityMap) return schema
  // treat as a single entity's field map
  return { items: schema }
}

function sqlEscape(value) {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "number" || typeof value === "boolean") return typeof value === "boolean" ? (value ? 1 : 0) : String(value)
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'`
  return `'${String(value).replace(/'/g, "''")}'`
}

function render(format, data, seed) {
  const names = Object.keys(data)
  if (format === "json") {
    const out = names.length === 1 ? data[names[0]] : data
    return JSON.stringify(out, null, 2)
  }
  if (format === "sql") {
    const blocks = []
    for (const [entity, rows] of Object.entries(data)) {
      if (!rows.length) continue
      const cols = Object.keys(rows[0])
      for (const row of rows) {
        const values = cols.map((c) => sqlEscape(row[c])).join(", ")
        blocks.push(`INSERT INTO ${entity} (${cols.join(", ")}) VALUES (${values});`)
      }
    }
    return `-- fixtures (seed ${seed})\n` + blocks.join("\n")
  }
  if (format === "csv") {
    return Object.entries(data)
      .map(([entity, rows]) => {
        if (!rows.length) return ""
        const cols = Object.keys(rows[0])
        const head = cols.join(",")
        const body = rows
          .map((row) => cols.map((c) => `"${String(row[c] ?? "").replace(/"/g, '""')}"`).join(","))
          .join("\n")
        return `# ${entity}\n${head}\n${body}`
      })
      .filter(Boolean)
      .join("\n\n")
  }
  // python
  const pyVal = (v) => {
    if (v === true) return "True"
    if (v === false) return "False"
    if (v === null || v === undefined) return "None"
    if (typeof v === "number") return String(v)
    return JSON.stringify(v)
  }
  const lines = [`# fixtures (seed ${seed})`, "FIXTURES = {"]
  for (const [entity, rows] of Object.entries(data)) {
    lines.push(`    ${JSON.stringify(entity)}: [`)
    for (const row of rows) {
      const fields = Object.entries(row)
        .map(([k, v]) => `${JSON.stringify(k)}: ${pyVal(v)}`)
        .join(", ")
      lines.push(`        {${fields}},`)
    }
    lines.push("    ],")
  }
  lines.push("}")
  return lines.join("\n")
}

async function introspect(dbPath, table) {
  if (!/^[A-Za-z0-9_]+$/.test(table)) throw new Error("Недопустимое имя таблицы")
  const { Database } = await import("bun:sqlite")
  const db = new Database(dbPath, { readonly: true })
  try {
    const cols = db.query(`PRAGMA table_info(${table})`).all()
    if (!cols.length) throw new Error(`Таблица ${table} не найдена или пуста`)
    return Object.fromEntries(cols.map((c) => [c.name, c.type || "text"]))
  } finally {
    db.close()
  }
}

export default async () => {
  return {
    tool: {
      generate_fixtures: tool({
        description:
          "Сгенерировать реалистичные тестовые данные (fixtures/mocks) из JSON-схемы или SQLite-таблицы. Форматы: json/sql/csv/python.",
        args: {
          schema: tool.schema.any().optional().describe("JSON-схема: {entity:{field:type}} или {entities:{...}}"),
          db: tool.schema.string().optional().describe("Путь к SQLite базе для интроспекции"),
          table: tool.schema.string().optional().describe("Таблица для интроспекции (с db)"),
          count: tool.schema.number().int().min(1).max(5000).default(10).describe("Строк на сущность"),
          seed: tool.schema.number().int().optional().describe("Seed для детерминизма"),
          format: tool.schema.enum(["json", "sql", "csv", "python"]).default("json"),
          out: tool.schema.string().optional().describe("Путь для записи результата"),
        },
        async execute(args) {
          const count = Number(args.count) || 10
          const format = args.format || "json"
          const seed = args.seed ?? Date.now() % 1_000_000_007
          const rng = mulberry32(seed)
          let entities
          if (args.db && args.table) {
            const fields = await introspect(args.db, args.table)
            entities = { [args.table]: fields }
          } else if (args.schema) {
            entities = normalizeSchema(args.schema)
          } else {
            return "Укажите schema (JSON) или db+table для генерации."
          }
          const names = Object.keys(entities)
          if (!names.length) return "Схема пустая."

          const data = {}
          for (const entity of names) {
            const fields = entities[entity]
            data[entity] = Array.from({ length: count }, () => {
              const row = {}
              for (const [field, type] of Object.entries(fields)) {
                row[field] = valueFor(rng, field, Array.isArray(type) ? type.join("|") : type)
              }
              return row
            })
          }

          const rendered = render(format, data, seed)
          if (args.out) {
            const target = path.resolve(args.out)
            mkdirSync(path.dirname(target), { recursive: true })
            writeFileSync(target, rendered)
            return `Сгенерировано ${count}×${names.length} (${names.join(", ")}), seed ${seed} → ${target}`
          }
          return `# ${count}×${names.length} (${names.join(", ")}), seed ${seed}\n${rendered}`
        },
      }),
    },
  }
}
