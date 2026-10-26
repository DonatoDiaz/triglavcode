#!/usr/bin/env bun
// TriglavCode 中文 (китайская) сборка.
// Применяет словарь locales/zh.json к исходникам, собирает обычный бинарь,
// затем git restore — исходники возвращаются в исходное состояние.
// Использование (из корня репозитория):
//   bun run --cwd packages/opencode script/build-zh.ts [--os win32|linux|darwin]
import { $ } from "bun"
import path from "path"
import fs from "fs"

const targetOsFlag = process.argv.find((a) => a.startsWith("--os="))
const targetOs = targetOsFlag ? targetOsFlag.slice(5) : "linux"

const opencodeDir = path.resolve(import.meta.dirname, "..")
const repoRoot = path.resolve(opencodeDir, "../..")
const dictPath = path.join(opencodeDir, "locales", "zh.json")
const srcDirs = [
  path.join(opencodeDir, "src"),
  path.join(opencodeDir, "../tui/src"),
  path.join(opencodeDir, "../core/src"),
]
const dict = JSON.parse(fs.readFileSync(dictPath, "utf8")) as Record<string, string>

// Нормализация: значение должно нести ту же обрамляющую строку, что и ключ.
// Ключи вида "X" / `X` / 'X' — значение отправляется модели без оболочки, поэтому
// восстанавливаем её здесь, а не полагаемся на ответ LLM.
function normalizeDict() {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(dict)) {
    const wrap = k.length >= 2 ? k[0] : ""
    const closes = k.length >= 2 ? k[k.length - 1] : ""
    const pairs = [["\"", "\""], ["`", "`"], ["'", "'"]]
    const matching = pairs.find(([a, b]) => a === wrap && b === closes)
    if (matching && v.startsWith(matching[0]) && v.endsWith(matching[1])) {
      out[k] = v
    } else if (matching) {
      out[k] = `${matching[0]}${v}${matching[1]}`
    } else {
      out[k] = v
    }
  }
  return out
}
const normalized = normalizeDict()
const keys = Object.keys(normalized).sort((a, b) => b.length - a.length)

let changedFiles = 0
let replacedTotal = 0
for (const root of srcDirs) {
  if (!fs.existsSync(root)) continue
  for (const file of await Array.fromAsync(new Bun.Glob("**/*.{ts,tsx}").scan({ cwd: root, absolute: true }))) {
    const rel = path.relative(opencodeDir, file)
    if (file.includes("node_modules") || file.includes("/dist/")) continue
    const src = fs.readFileSync(file, "utf8")
    let out = src
    let replaced = 0
    for (const k of keys) {
      const count = out.split(k).length - 1
      if (count > 0) {
        out = out.split(k).join(normalized[k])
        replaced += count
      }
    }
    if (replaced > 0) {
      fs.writeFileSync(file, out)
      changedFiles++
      replacedTotal += replaced
      console.log(`  ${path.relative(opencodeDir, file)}: ${replaced}`)
    }
  }
}
console.log(`Applied ${replacedTotal} replacements across ${changedFiles} files (dict: ${keys.length} entries)`)
console.log("Running build...")

try {
  await $`${process.execPath} run script/build.ts --os=${targetOs} --skip-install`.cwd(opencodeDir)
} finally {
  // git restore вне зависимости от результата сборки (пути от корня репозитория)
  await $`git restore packages/opencode/src packages/tui/src packages/core/src`.cwd(repoRoot).catch(() => {})
  console.log("Sources restored. Chinese binary in packages/opencode/dist/triglavcode-*/bin/triglavcode")
}