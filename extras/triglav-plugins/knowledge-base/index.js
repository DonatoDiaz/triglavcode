/**
 * TriglavCode — база знаний (Obsidian / Markdown / textbooks).
 *
 * Доступ к заметкам Obsidian и любым Markdown-репозиториям: поиск, чтение,
 * запись, backlinks, теги. Плюс семантический поиск по отдельному RAG-воркспейсу
 * с учебниками (~/knowledge) через CLI opencode-rag — без переиндексации home.
 *
 * Конфиг источников: $TRIGLAV_STATE_DIR/kb.json  (или env OBSIDIAN_VAULT)
 * Инструменты: kb_config, kb_search, kb_semantic, kb_read, kb_list, kb_write, kb_backlinks, kb_tags
 */
import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { homedir } from "node:os"
import path from "node:path"
import { STATE_DIR, ensureDir, clip } from "../_shared/tc.js"

const CONFIG = path.join(STATE_DIR, "kb.json")
const RAG_CONFIG = process.env.TRIGLAV_KB_RAG_CONFIG || path.join(homedir(), "knowledge", "opencode-rag.json")
const TEXT_EXT = new Set([".md", ".mdx", ".markdown", ".txt", ".html", ".htm", ".rst"])
const SKIP_DIRS = new Set(["node_modules", ".git", ".obsidian", ".venv", "venv", "__pycache__", "dist", "build", ".opencode"])

function loadConfig() {
  try {
    if (existsSync(CONFIG)) return JSON.parse(readFileSync(CONFIG, "utf8"))
  } catch {}
  return {}
}

function saveConfig(cfg) {
  ensureDir()
  writeFileSync(CONFIG, JSON.stringify(cfg, null, 2))
}

function defaultRoots() {
  const cfg = loadConfig()
  const roots = new Set()
  for (const value of [process.env.OBSIDIAN_VAULT, process.env.TRIGLAV_KB_ROOTS].filter(Boolean)) {
    for (const part of String(value).split(path.delimiter)) if (part) roots.add(part)
  }
  for (const value of [...(cfg.roots || []), ...(cfg.vaults || []), ...(cfg.notes || [])]) roots.add(value)
  for (const candidate of ["knowledge", "Documents", "notes", "Notes", "vault", "Obsidian", "second-brain"]) {
    const dir = path.join(homedir(), candidate)
    if (existsSync(dir)) roots.add(dir)
  }
  // auto-detect Obsidian vaults shallowly
  try {
    for (const entry of readdirSync(homedir(), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue
      const dir = path.join(homedir(), entry.name)
      if (SKIP_DIRS.has(entry.name)) continue
      try {
        if (existsSync(path.join(dir, ".obsidian"))) roots.add(dir)
      } catch {}
    }
  } catch {}
  return [...roots].filter((r) => existsSync(r))
}

function textFiles(root, limit = 8000) {
  const out = []
  const stack = [root]
  while (stack.length && out.length < limit) {
    const dir = stack.pop()
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (out.length >= limit) break
      if (entry.name.startsWith(".") && entry.name !== ".obsidian") continue
      if (SKIP_DIRS.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile() && TEXT_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full)
    }
  }
  return out
}

function strip(text, ext) {
  if (ext === ".html" || ext === ".htm") {
    return text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
  }
  return text
}

function readText(file, max = 400_000) {
  try {
    if (statSync(file).size > max) return null
    return readFileSync(file, "utf8")
  } catch {
    return null
  }
}

function tokenize(query) {
  return [...new Set(String(query).toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || [])]
}

function search(query, { roots, limit = 20 } = {}) {
  const terms = tokenize(query)
  if (!terms.length) return []
  const results = []
  for (const root of roots) {
    for (const file of textFiles(root)) {
      const raw = readText(file)
      if (raw == null) continue
      const ext = path.extname(file).toLowerCase()
      const text = strip(raw, ext)
      const lower = text.toLowerCase()
      let score = 0
      for (const term of terms) {
        const idx = lower.indexOf(term)
        if (idx === -1) continue
        score += 1
        // count occurrences (capped)
        let from = 0
        let hits = 0
        while (hits < 50) {
          const at = lower.indexOf(term, from)
          if (at === -1) break
          hits++
          from = at + term.length
        }
        score += Math.min(hits, 20) * 0.05
        if (path.basename(file).toLowerCase().includes(term)) score += 1.5
      }
      if (score <= 0) continue
      const first = Math.max(0, lower.indexOf(terms[0]))
      const snippet = text.slice(Math.max(0, first - 100), first + 220).replace(/\s+/g, " ").trim()
      results.push({ file, score, snippet })
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

export default async () => {
  return {
    tool: {
      kb_config: tool({
        description: "Показать/добавить/удалить источники знаний (Obsidian vaults, папки заметок).",
        args: {
          action: tool.schema.enum(["list", "add", "remove"]).default("list"),
          path: tool.schema.string().optional(),
        },
        async execute(args) {
          const cfg = loadConfig()
          if (args.action === "add" && args.path) {
            const resolved = path.resolve(args.path.replace(/^~(?=$|\/)/, homedir()))
            const roots = new Set(cfg.roots || [])
            roots.add(resolved)
            cfg.roots = [...roots]
            saveConfig(cfg)
            return `Добавлен источник: ${resolved}`
          }
          if (args.action === "remove" && args.path) {
            cfg.roots = (cfg.roots || []).filter((r) => path.resolve(r) !== path.resolve(args.path))
            saveConfig(cfg)
            return `Удалён источник: ${args.path}`
          }
          const roots = defaultRoots()
          return ["Источники знаний:", ...roots.map((r) => `  ${r}`), `RAG-воркспейс книг: ${RAG_CONFIG}`].join("\n")
        },
      }),

      kb_search: tool({
        description: "Полнотекстовый поиск по заметкам Obsidian/Markdown и учебникам.",
        args: {
          query: tool.schema.string(),
          limit: tool.schema.number().int().min(1).max(100).default(20),
          root: tool.schema.string().optional().describe("Ограничить поиск одним источником"),
        },
        async execute(args) {
          const roots = args.root ? [path.resolve(args.root.replace(/^~(?=$|\/)/, homedir()))] : defaultRoots()
          if (!roots.length) return "Нет источников. Добавьте: kb_config(action=add, path=...) или env OBSIDIAN_VAULT."
          const hits = search(args.query, { roots, limit: Number(args.limit) || 20 })
          if (!hits.length) return "Ничего не найдено."
          return hits
            .map((h) => `${h.file}  (score ${h.score.toFixed(2)})\n    ${h.snippet}`)
            .join("\n\n")
        },
      }),

      kb_semantic: tool({
        description:
          "Семантический поиск по RAG-воркспейсу с учебниками/книгами (opencode-rag, отдельный store).",
        args: {
          query: tool.schema.string(),
          limit: tool.schema.number().int().min(1).max(50).default(8),
        },
        async execute(args) {
          if (!existsSync(RAG_CONFIG)) {
            return `RAG-воркспейс книг не найден (${RAG_CONFIG}). Проиндексируйте ~/knowledge: cd ~/knowledge && opencode-rag index -y`
          }
          try {
            const out = execFileSync(
              "opencode-rag",
              ["query", "-c", RAG_CONFIG, "-n", String(Number(args.limit) || 8), args.query],
              { encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024, cwd: path.dirname(RAG_CONFIG) },
            )
            return clip(out.trim() || "(пусто)", 12_000)
          } catch (error) {
            return `Семантический поиск не удался: ${error?.message ?? error}. Фолбэк — kb_search.`
          }
        },
      }),

      kb_read: tool({
        description: "Прочитать файл заметки.",
        args: {
          path: tool.schema.string(),
          start: tool.schema.number().int().min(1).optional(),
          lines: tool.schema.number().int().min(1).max(2000).optional(),
        },
        async execute(args) {
          const file = path.resolve(String(args.path).replace(/^~(?=$|\/)/, homedir()))
          if (!existsSync(file)) return `Не найдено: ${file}`
          const text = readFileSync(file, "utf8")
          const all = text.split("\n")
          const start = (Number(args.start) || 1) - 1
          const count = Number(args.lines) || all.length
          return all.slice(start, start + count).map((line, i) => `${start + i + 1}: ${line}`).join("\n")
        },
      }),

      kb_list: tool({
        description: "Список заметок в источниках знаний.",
        args: {
          root: tool.schema.string().optional(),
          limit: tool.schema.number().int().min(1).max(2000).default(200),
        },
        async execute(args) {
          const roots = args.root ? [path.resolve(args.root.replace(/^~(?=$|\/)/, homedir()))] : defaultRoots()
          const files = []
          for (const root of roots) files.push(...textFiles(root, Number(args.limit) || 200))
          const list = files.slice(0, Number(args.limit) || 200)
          return list.length ? list.join("\n") : "Пусто."
        },
      }),

      kb_write: tool({
        description: "Создать или дописать заметку (Markdown). Относительный путь — от первого источника.",
        args: {
          path: tool.schema.string(),
          content: tool.schema.string(),
          mode: tool.schema.enum(["create", "append"]).default("create"),
          frontmatter: tool.schema.string().optional().describe("YAML-frontmatter (без ---)"),
        },
        async execute(args) {
          const roots = defaultRoots()
          let file = String(args.path)
          if (!path.isAbsolute(file)) {
            const base = roots[0] || path.join(homedir(), "knowledge")
            file = path.join(base, file)
          }
          mkdirSync(path.dirname(file), { recursive: true })
          if (args.mode === "append") {
            appendFileSync(file, args.content)
          } else {
            const fm = args.frontmatter ? `---\n${args.frontmatter}\n---\n\n` : ""
            writeFileSync(file, fm + args.content)
          }
          return `Записано: ${file}`
        },
      }),

      kb_backlinks: tool({
        description: "Найти заметки, ссылающиеся на данную ([[wikilinks]]).",
        args: { path: tool.schema.string() },
        async execute(args) {
          const target = path.basename(String(args.path)).replace(/\.(md|mdx|markdown|txt)$/i, "")
          const roots = defaultRoots()
          const hits = []
          for (const root of roots) {
            for (const file of textFiles(root)) {
              if (path.basename(file).replace(/\.(md|mdx|markdown|txt)$/i, "") === target) continue
              const text = readText(file, 200_000)
              if (!text) continue
              const re = new RegExp(`\\[\\[\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\||\\]|#)`, "i")
              if (re.test(text)) hits.push(file)
            }
          }
          return hits.length ? hits.join("\n") : "Ссылок не найдено."
        },
      }),

      kb_tags: tool({
        description: "Собрать теги из frontmatter (tags:) и inline #tag по источникам.",
        args: { root: tool.schema.string().optional() },
        async execute(args) {
          const roots = args.root ? [path.resolve(String(args.root).replace(/^~(?=$|\/)/, homedir()))] : defaultRoots()
          const counts = new Map()
          for (const root of roots) {
            for (const file of textFiles(root)) {
              const text = readText(file, 200_000)
              if (!text) continue
              const fm = text.match(/^---\n([\s\S]*?)\n---/)
              if (fm) {
                const line = fm[1].match(/tags:\s*(.+)/i)
                if (line) {
                  for (const tag of line[1].replace(/[\[\]]/g, "").split(/[,\s]+/).filter(Boolean)) {
                    counts.set(tag, (counts.get(tag) || 0) + 1)
                  }
                }
              }
              for (const tag of text.match(/(^|\s)#([\p{L}\p{N}_-]{2,})/gu) || []) {
                const clean = tag.trim().slice(1)
                if (clean && !clean.startsWith("#")) counts.set(clean, (counts.get(clean) || 0) + 1)
              }
            }
          }
          const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
          return sorted.length ? sorted.map(([t, n]) => `#${t} (${n})`).join(", ") : "Тегов не найдено."
        },
      }),
    },
  }
}
