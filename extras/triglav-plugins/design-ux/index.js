/**
 * TriglavCode — дизайн/UX ревью.
 *
 * Статический анализ HTML/JSX/TSX/Vue/Svelte/CSS по принципам психологии
 * восприятия: закон Фиттса, Хика, Миллера, гештальт (близость/выравнивание),
 * визуальная иерархия, когнитивная нагрузка, контраст WCAG, доступность,
 * prefers-reduced-motion, Doherty threshold.
 *
 * Инструменты: ux_review, ux_checklist
 */
import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"

const EXTS = new Set([".html", ".htm", ".jsx", ".tsx", ".js", ".ts", ".vue", ".svelte", ".css", ".scss"])
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", ".venv", "venv", "__pycache__", ".opencode"])

function resolvePath(input) {
  return path.resolve(String(input).replace(/^~(?=$|\/)/, homedir()))
}

function walk(dir, out, limit) {
  const stack = [dir]
  while (stack.length && out.length < limit) {
    const current = stack.pop()
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (out.length >= limit) break
      if (entry.name.startsWith(".")) continue
      if (SKIP.has(entry.name)) continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile() && EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full)
    }
  }
}

function globToRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "§§").replace(/\*/g, "[^/]*").replace(/§§/g, ".*").replace(/\?/g, ".")
  return new RegExp(`^${escaped}$`)
}

async function collect(input, maxFiles) {
  const files = []
  if (input.url) {
    const res = await fetch(input.url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return [{ file: input.url, text: await res.text(), ext: ".html" }]
  }
  const target = resolvePath(input.path || input.glob || ".")
  if (input.glob && !input.path) {
    const base = target.slice(0, target.search(/[*?]/))
    const root = statSync(base || ".").isDirectory() ? base : path.dirname(base)
    const re = globToRegex(target)
    const candidates = []
    walk(root || ".", candidates, maxFiles * 4)
    for (const file of candidates) if (re.test(file)) files.push(file)
  } else if (existsSync(target) && statSync(target).isDirectory()) {
    walk(target, files, maxFiles)
  } else if (existsSync(target)) {
    files.push(target)
  }
  return files.slice(0, maxFiles).map((file) => {
    const text = readFileSync(file, "utf8").slice(0, 400_000)
    return { file, text, ext: path.extname(file).toLowerCase() }
  })
}

function hexToRgb(hex) {
  let h = hex.replace("#", "").trim()
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (h.length === 8) h = h.slice(0, 6)
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function luminance([r, g, b]) {
  const f = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function analyze(text, file, ext) {
  const findings = []
  const add = (severity, law, message, fix) => findings.push({ severity, law, message, fix, file })
  const isCss = ext === ".css" || ext === ".scss"
  const html = isCss ? "" : text

  if (isCss) {
    if (!/prefers-reduced-motion/.test(text)) add("P2", "Доступность", "Нет @media (prefers-reduced-motion) — анимации не отключаются.", "Добавьте reduced-motion: уменьшайте/убирайте transition/animation.")
    if (!/:focus(-visible)?/.test(text)) add("P1", "Доступность", "Не найдено стилей :focus/:focus-visible.", "Добавьте заметный focus-ring для клавиатурной навигации.")
    const small = [...text.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
    if (small.some((v) => v < 12)) add("P2", "Читаемость", "Есть font-size < 12px.", "Минимум 12px для второстепенного, 14–16px для основного текста.")
    const slow = [...text.matchAll(/(?:transition|animation)(?:-duration)?:\s*(?:[^;\n]*?)(\d+(?:\.\d+)?)m?s/g)].map((m) => (m[0].includes("ms") ? Number(m[1]) : Number(m[1]) * 1000))
    if (slow.some((v) => v > 400)) add("P2", "Doherty threshold", "Анимации/переходы > 400 мс воспринимаются медленными.", "Держите UI-отклик ≤ 200–400 мс.")
  } else {
    const imgNoAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length
    if (imgNoAlt) add("P0", "Доступность", `${imgNoAlt} <img> без alt.`, "Добавьте осмысленный alt или alt=\"\" для декоративных.")
    const emptyButtons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].filter(
      (m) => !stripTags(m[2]) && !/aria-label|title=/i.test(m[1]),
    ).length
    if (emptyButtons) add("P1", "Доступность", `${emptyButtons} кнопок без текста и aria-label (иконки).`, "Добавьте aria-label или видимый текст.")
    const inputs = (html.match(/<input\b[^>]*>/gi) || []).filter((tag) => !/type=["']?(hidden|submit|button|reset|checkbox|radio)/i.test(tag))
    const unlabeled = inputs.filter((tag) => !/aria-label|aria-labelledby|placeholder|id=/i.test(tag)).length
    if (unlabeled) add("P1", "Доступность", `${unlabeled} input без label/aria/placeholder.`, "Свяжите <label for> или добавьте aria-label.")
    if (ext === ".html" && !/<html[^>]*\blang=/i.test(html)) add("P2", "Доступность", "У <html> нет атрибута lang.", "Укажите lang=\"ru\" (или нужный).")

    const h = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]))
    const h1 = h.filter((v) => v === 1).length
    if (h1 === 0) add("P1", "Визуальная иерархия", "Нет <h1> — нет главного заголовка.", "Добавьте один <h1> на страницу.")
    if (h1 > 1) add("P2", "Визуальная иерархия", `${h1} <h1> — размытая иерархия.`, "Оставьте один h1, остальное — h2/h3.")
    for (let i = 1; i < h.length; i++) {
      if (h[i] - h[i - 1] > 1) {
        add("P2", "Визуальная иерархия", "Пропуск уровня заголовков (например h2 → h4).", "Держите последовательность уровней.")
        break
      }
    }

    const navBlocks = [...html.matchAll(/<nav\b[\s\S]*?<\/nav>/gi)].map((m) => m[0]).join("\n")
    const navLinks = navBlocks ? (navBlocks.match(/<a\b/gi) || []).length : 0
    if (navLinks > 7) add("P1", "Закон Хика", `В навигации ${navLinks} ссылок — паралич выбора.`, "Сгруппируйте в меню/дропдауны, оставьте ≤ 7 пунктов.")
    const buttons = (html.match(/<button\b/gi) || []).length + (html.match(/<a\b[^>]*class=["'][^"']*btn/gi) || []).length
    if (buttons > 8) add("P2", "Закон Хика", `${buttons} интерактивных элементов — много равнозначных выборов.`, "Выделите один primary-CTA, остальное — secondary/tertiary.")

    const forms = [...html.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map((m) => m[0])
    for (const form of forms) {
      const fields = (form.match(/<(input|select|textarea)\b/gi) || []).length
      if (fields > 7) {
        add("P1", "Закон Миллера", `Форма с ${fields} полями — перегрузка.`, "Разбейте на шаги/секции по 5–7 полей (chunking).")
        break
      }
    }

    // contrast from CSS variables if present in the same file (inline <style>)
    const bg = html.match(/--[\w-]*(?:bg|background)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,8})/)
    const fg = html.match(/--[\w-]*(?:text|fg|foreground)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,8})/)
    if (bg && fg) {
      const c = contrast(hexToRgb(bg[1]), hexToRgb(fg[1]))
      if (c && c < 4.5) add("P1", "Контраст WCAG", `Контраст текста ~${c.toFixed(2)}:1 (< 4.5).`, "Увеличьте контраст текста к фону до ≥ 4.5:1.")
    }

    const buttonsInline = [...html.matchAll(/<button\b[^>]*style=["'][^"']*?(?:width|height|padding)\s*:\s*(\d+)px/gi)]
    if (buttonsInline.some((m) => Number(m[1]) < 44)) add("P1", "Закон Фиттса", "Кликабельные элементы < 44px.", "Минимум 44×44px (тач) / 32px (десктоп) для целей.")
  }

  // shared: colors / font sizes / motion
  const colors = new Set([...text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()))
  if (colors.size > 20) add("P2", "Когнитивная нагрузка", `${colors.size} разных цветов — визуальный шум.`, "Сократите палитру до токенов (5–8 оттенков).")
  const sizes = new Set([...text.matchAll(/font-size:\s*([\d.]+)(px|rem|em)/g)].map((m) => m[1] + m[2]))
  if (sizes.size > 7) add("P2", "Когнитивная нагрузка", `${sizes.size} размеров шрифта — нет модульной шкалы.`, "Используйте шкалу (12/14/16/20/24/32) и токены.")
  if (!isCss && /animation:|transition:/.test(text) && !/prefers-reduced-motion/.test(text)) {
    add("P2", "Доступность", "Анимации без prefers-reduced-motion.", "Уважайте настройку reduced motion.")
  }

  return findings
}

const WEIGHT = { P0: 25, P1: 10, P2: 4 }

export default async () => {
  return {
    tool: {
      ux_checklist: tool({
        description: "Чек-лист UX-законов и порогов, по которым работает ux_review.",
        args: {},
        async execute() {
          return [
            "Закон Фиттса: цели ≥ 44×44px (тач), ≥ 32px (десктоп).",
            "Закон Хика: ≤ 7 равнозначных пунктов в навигации/выборе.",
            "Закон Миллера: ≤ 7±2 полей/элементов в блоке (chunking).",
            "Гештальт: единая шкала отступов (4/8px), близость группирует связанное.",
            "Визуальная иерархия: один h1, без пропуска уровней, акцент на primary-CTA.",
            "Контраст WCAG AA: ≥ 4.5:1 для текста, ≥ 3:1 для крупного/иконок.",
            "Доступность: alt у изображений, label у полей, aria-label у иконочных кнопок, lang.",
            "Клавиатура: видимый :focus/:focus-visible, логичный tab-порядок.",
            "Doherty threshold: отклик UI ≤ 200–400 мс, индикаторы загрузки.",
            "Reduced motion: отключать анимации при prefers-reduced-motion.",
            "Когнитивная нагрузка: ограниченная палитра и модульная шкала шрифтов.",
          ].join("\n")
        },
      }),

      ux_review: tool({
        description:
          "UX-ревью фронтенд-кода/страницы по законам восприятия. Принимает path (файл/папка), glob или url.",
        args: {
          path: tool.schema.string().optional(),
          glob: tool.schema.string().optional(),
          url: tool.schema.string().optional(),
          maxFiles: tool.schema.number().int().min(1).max(200).default(40),
          format: tool.schema.enum(["text", "json"]).default("text"),
        },
        async execute(args) {
          if (!args.path && !args.glob && !args.url) return "Укажите path, glob или url."
          let entries
          try {
            entries = await collect(args, Number(args.maxFiles) || 40)
          } catch (e) {
            return `Не удалось собрать файлы: ${e.message}`
          }
          if (!entries.length) return "Файлы не найдены."
          const all = []
          for (const entry of entries) all.push(...analyze(entry.text, entry.file, entry.ext))
          const score = Math.max(0, 100 - all.reduce((sum, f) => sum + (WEIGHT[f.severity] || 0), 0))
          if (args.format === "json") {
            return JSON.stringify({ score, files: entries.length, findings: all }, null, 2)
          }
          const grouped = ["P0", "P1", "P2"]
            .map((sev) => {
              const items = all.filter((f) => f.severity === sev)
              if (!items.length) return ""
              return `\n${sev} (${items.length}):\n` + items.map((f) => `  • [${f.law}] ${f.message}\n    fix: ${f.fix}`).join("\n")
            })
            .filter(Boolean)
            .join("\n")
          return [
            `UX-скор: ${score}/100 (файлов: ${entries.length}, находок: ${all.length})`,
            grouped || "\nНаходок нет — отлично.",
          ].join("\n")
        },
      }),
    },
  }
}
