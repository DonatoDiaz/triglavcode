#!/usr/bin/env bun
// TriglavCode 中文 (китайская) сборка.
// Применяет словарь locales/zh.json к исходникам, собирает обычный бинарь,
// затем git restore — исходники возвращаются в исходное состояние.
// Использование (из корня репозитория):
//   bun run --cwd packages/opencode script/build-zh.ts
import { $ } from "bun"
import path from "path"
import fs from "fs"

const opencodeDir = path.resolve(import.meta.dirname, "..")
const dictPath = path.join(opencodeDir, "locales", "zh.json")
const srcDirs = [
  path.join(opencodeDir, "src"),
  path.join(opencodeDir, "../tui/src"),
  path.join(opencodeDir, "../core/src"),
]
const dict = JSON.parse(fs.readFileSync(dictPath, "utf8")) as Record<string, string>
const keys = Object.keys(dict).sort((a, b) => b.length - a.length)

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
        out = out.split(k).join(dict[k])
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
  await $`OPENCODE_VERSION=${process.env.OPENCODE_VERSION ?? "1.18.29-triglav.1"} bun run script/build.ts --single --skip-install --skip-embed-web-ui`.cwd(opencodeDir)
} finally {
  // git restore вне зависимости от результата сборки
  console.log("Restoring sources...")
  await $`git restore src packages/tui/src packages/core/src`.cwd(process.cwd()).catch(() => {})
  console.log("Sources restored. Chinese binary in packages/opencode/dist/triglavcode-*/bin/triglavcode")
}