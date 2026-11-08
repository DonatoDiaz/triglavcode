/**
 * TriglavCode — генерация медиаконтента.
 *
 * Реальные файлы без внешних сервисов: процедурные изображения (PPM→PNG через
 * ffmpeg), аудио (синтез WAV), видео (кадры→MP4 через ffmpeg). Опционально —
 * ComfyUI (если задан COMFY_WORKFLOW) и OpenAI Images (если есть OPENAI_API_KEY).
 * Плюс описание изображения локальной vision-моделью Ollama (moondream).
 *
 * Инструменты: media_backends, image_generate, audio_generate, video_generate, image_describe
 */
import { tool } from "@opencode-ai/plugin"
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, statSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { homedir } from "node:os"
import path from "node:path"
import { STATE_DIR, ensureDir } from "../_shared/tc.js"

const MEDIA_DIR = process.env.TRIGLAV_MEDIA_DIR || path.join(STATE_DIR, "media")

function has(cmd) {
  try {
    execFileSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function hashStr(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rngFrom(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function outPath(out, ext) {
  ensureDir(MEDIA_DIR)
  if (out) {
    const resolved = path.resolve(String(out).replace(/^~(?=$|\/)/, homedir()))
    mkdirSync(path.dirname(resolved), { recursive: true })
    return resolved
  }
  return path.join(MEDIA_DIR, `media_${Date.now()}.${ext}`)
}

function writePPM(file, w, h, shade) {
  const header = Buffer.from(`P6\n${w} ${h}\n255\n`, "ascii")
  const data = Buffer.allocUnsafe(w * h * 3)
  let i = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = shade(x, y)
      data[i++] = r
      data[i++] = g
      data[i++] = b
    }
  }
  writeFileSync(file, Buffer.concat([header, data]))
}

function proceduralImage(prompt, width, height, seed, ppmPath) {
  const rng = rngFrom(seed)
  const hue = seed % 360
  const bgA = hslToRgb(hue, 0.55, 0.12)
  const bgB = hslToRgb(hue + 40, 0.6, 0.28)
  const shapes = Array.from({ length: 7 }, () => {
    const kind = rng() > 0.5 ? "circle" : "rect"
    const color = hslToRgb(hue + rng() * 180, 0.7, 0.45 + rng() * 0.3)
    return {
      kind,
      cx: rng() * width,
      cy: rng() * height,
      r: 40 + rng() * Math.min(width, height) * 0.28,
      x: rng() * width,
      y: rng() * height,
      w: 40 + rng() * width * 0.4,
      h: 40 + rng() * height * 0.4,
      alpha: 0.25 + rng() * 0.35,
      color,
    }
  })
  writePPM(ppmPath, width, height, (x, y) => {
    const t = y / height
    let r = bgA[0] * (1 - t) + bgB[0] * t
    let g = bgA[1] * (1 - t) + bgB[1] * t
    let b = bgA[2] * (1 - t) + bgB[2] * t
    for (const s of shapes) {
      let inside = false
      if (s.kind === "circle") {
        const dx = x - s.cx
        const dy = y - s.cy
        inside = dx * dx + dy * dy < s.r * s.r
      } else {
        inside = x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h
      }
      if (inside) {
        r = r * (1 - s.alpha) + s.color[0] * s.alpha
        g = g * (1 - s.alpha) + s.color[1] * s.alpha
        b = b * (1 - s.alpha) + s.color[2] * s.alpha
      }
    }
    // subtle grid
    if (x % 64 === 0 || y % 64 === 0) {
      r += 12
      g += 12
      b += 12
    }
    return [Math.min(255, r) | 0, Math.min(255, g) | 0, Math.min(255, b) | 0]
  })
}

function ppmToPng(ppm, png) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", ppm, png], { timeout: 120_000 })
}

function writeWav(file, seconds, seed, prompt) {
  const rate = 22050
  const total = Math.floor(rate * seconds)
  const data = Buffer.alloc(total * 2)
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]
  const rng = rngFrom(seed)
  const noteDur = 0.28
  for (let i = 0; i < total; i++) {
    const t = i / rate
    const noteIndex = Math.floor(t / noteDur) % scale.length
    let f = scale[(noteIndex + (seed % scale.length)) % scale.length]
    // occasional leap for variation
    if (Math.floor(t / (noteDur * 8)) % 3 === 0 && rng() > 0.5) f *= 1.0
    const local = t % noteDur
    const env = Math.min(1, local / 0.02) * Math.exp(-3.5 * local)
    const sample = Math.sin(2 * Math.PI * f * t) * 0.5 + Math.sin(2 * Math.PI * f * 2 * t) * 0.18
    const value = Math.max(-1, Math.min(1, sample * env * 0.8))
    data.writeInt16LE((value * 32767) | 0, i * 2)
  }
  const header = Buffer.alloc(44)
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write("data", 36)
  header.writeUInt32LE(data.length, 40)
  writeFileSync(file, Buffer.concat([header, data]))
}

async function probeComfy() {
  const url = process.env.COMFYUI_URL || "http://127.0.0.1:8188"
  try {
    const res = await fetch(`${url}/system_stats`, { signal: AbortSignal.timeout(2500) })
    return res.ok
  } catch {
    return false
  }
}

function deepReplace(value, needle, replacement) {
  if (typeof value === "string") return value.split(needle).join(replacement)
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, needle, replacement))
  if (value && typeof value === "object") {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = deepReplace(v, needle, replacement)
    return out
  }
  return value
}

async function comfyImage(prompt, out) {
  const url = process.env.COMFYUI_URL || "http://127.0.0.1:8188"
  const wfPath = process.env.COMFY_WORKFLOW
  if (!wfPath || !existsSync(wfPath)) throw new Error("ComfyUI: задайте COMFY_WORKFLOW (путь к workflow JSON с {{prompt}})")
  const workflow = deepReplace(JSON.parse(readFileSync(wfPath, "utf8")), "{{prompt}}", prompt)
  const res = await fetch(`${url}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  })
  if (!res.ok) throw new Error(`ComfyUI /prompt HTTP ${res.status}`)
  const { prompt_id } = await res.json()
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const hist = await fetch(`${url}/history/${prompt_id}`).then((r) => r.json()).catch(() => ({}))
    const entry = hist?.[prompt_id]
    if (!entry) continue
    const outputs = entry.outputs || {}
    for (const node of Object.values(outputs)) {
      const images = node?.images
      if (Array.isArray(images) && images.length) {
        const img = images[0]
        const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder || "", type: img.type || "output" })
        const blob = await fetch(`${url}/view?${q}`).then((r) => r.arrayBuffer())
        writeFileSync(out, Buffer.from(blob))
        return true
      }
    }
  }
  throw new Error("ComfyUI: таймаут ожидания результата")
}

async function openaiImage(prompt, width, height, out) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY не задан")
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1"
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, prompt, size: `${width}x${height}`, n: 1 }),
  })
  if (!res.ok) throw new Error(`OpenAI images HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const item = data?.data?.[0]
  if (item?.b64_json) {
    writeFileSync(out, Buffer.from(item.b64_json, "base64"))
    return true
  }
  if (item?.url) {
    const blob = await fetch(item.url).then((r) => r.arrayBuffer())
    writeFileSync(out, Buffer.from(blob))
    return true
  }
  throw new Error("OpenAI: пустой ответ")
}

export default async () => {
  return {
    tool: {
      media_backends: tool({
        description: "Показать доступные бэкенды генерации медиа (локальные и по ключам).",
        args: {},
        async execute() {
          const comfy = await probeComfy()
          return [
            `ffmpeg: ${has("ffmpeg")}`,
            `ImageMagick: ${has("magick")}`,
            `Blender: ${has("blender")}`,
            `ComfyUI (${process.env.COMFYUI_URL || "http://127.0.0.1:8188"}): ${comfy}`,
            `ComfyUI workflow: ${process.env.COMFY_WORKFLOW || "(не задан)"}`,
            `OpenAI images: ${Boolean(process.env.OPENAI_API_KEY)}`,
            `Ollama vision: ${has("ollama")}`,
            `Медиа-каталог: ${MEDIA_DIR}`,
          ].join("\n")
        },
      }),

      image_generate: tool({
        description:
          "Сгенерировать изображение. backend=auto: ComfyUI (если настроен) → OpenAI (если ключ) → процедурно. Процедурный режим работает офлайн.",
        args: {
          prompt: tool.schema.string(),
          width: tool.schema.number().int().min(64).max(2048).default(1024),
          height: tool.schema.number().int().min(64).max(2048).default(1024),
          out: tool.schema.string().optional(),
          seed: tool.schema.number().int().optional(),
          backend: tool.schema.enum(["auto", "procedural", "comfy", "openai"]).default("auto"),
        },
        async execute(args) {
          const out = outPath(args.out, "png")
          const seed = args.seed ?? hashStr(args.prompt)
          const backend = args.backend || "auto"
          const errors = []
          if (backend === "comfy" || (backend === "auto" && (await probeComfy()) && process.env.COMFY_WORKFLOW)) {
            try {
              await comfyImage(args.prompt, out)
              return `Изображение (ComfyUI): ${out}`
            } catch (e) {
              errors.push(`comfy: ${e.message}`)
            }
          }
          if (backend === "openai" || (backend === "auto" && process.env.OPENAI_API_KEY)) {
            try {
              await openaiImage(args.prompt, args.width, args.height, out)
              return `Изображение (OpenAI): ${out}`
            } catch (e) {
              errors.push(`openai: ${e.message}`)
            }
          }
          // procedural fallback
          const ppm = out.replace(/\.png$/i, "") + ".ppm"
          proceduralImage(args.prompt, args.width, args.height, seed, ppm)
          try {
            ppmToPng(ppm, out)
          } finally {
            rmSync(ppm, { force: true })
          }
          const suffix = errors.length ? `\n(backends: ${errors.join("; ")})` : ""
          return `Изображение (процедурное, ${args.width}×${args.height}, seed ${seed}): ${out}${suffix}`
        },
      }),

      audio_generate: tool({
        description: "Сгенерировать аудио (WAV). По умолчанию — процедурный синтез по промпту.",
        args: {
          prompt: tool.schema.string(),
          seconds: tool.schema.number().min(0.5).max(60).default(6),
          out: tool.schema.string().optional(),
        },
        async execute(args) {
          const out = outPath(args.out, "wav")
          const seed = hashStr(args.prompt)
          writeWav(out, Number(args.seconds) || 6, seed, args.prompt)
          return `Аудио (процедурное, ${args.seconds || 6}s): ${out}`
        },
      }),

      video_generate: tool({
        description: "Сгенерировать видео (MP4) процедурно: анимированные кадры + звук через ffmpeg.",
        args: {
          prompt: tool.schema.string(),
          seconds: tool.schema.number().min(1).max(15).default(4),
          width: tool.schema.number().int().min(160).max(1280).default(640),
          height: tool.schema.number().int().min(120).max(720).default(360),
          out: tool.schema.string().optional(),
        },
        async execute(args) {
          if (!has("ffmpeg")) return "ffmpeg не найден — видео без него не собрать."
          const seconds = Number(args.seconds) || 4
          const fps = 24
          const frames = Math.floor(seconds * fps)
          const w = args.width || 640
          const h = args.height || 360
          const out = outPath(args.out, "mp4")
          const dir = path.join(MEDIA_DIR, `frames_${Date.now()}`)
          mkdirSync(dir, { recursive: true })
          const seed = hashStr(args.prompt)
          try {
            for (let i = 0; i < frames; i++) {
              const t = i / frames
              const hue = (seed % 360) + t * 120
              const c1 = hslToRgb(hue, 0.7, 0.15)
              const c2 = hslToRgb(hue + 80, 0.8, 0.35)
              const cx = w / 2 + Math.cos(t * Math.PI * 2) * w * 0.25
              const cy = h / 2 + Math.sin(t * Math.PI * 2) * h * 0.25
              const file = path.join(dir, `frame_${String(i).padStart(4, "0")}.ppm`)
              writePPM(file, w, h, (x, y) => {
                const k = y / h
                let r = c1[0] * (1 - k) + c2[0] * k
                let g = c1[1] * (1 - k) + c2[1] * k
                let b = c1[2] * (1 - k) + c2[2] * k
                const dx = x - cx
                const dy = y - cy
                const d = Math.sqrt(dx * dx + dy * dy)
                if (d < 70) {
                  r = 255
                  g = 40
                  b = 200
                }
                return [r | 0, g | 0, b | 0]
              })
            }
            const wav = path.join(dir, "audio.wav")
            writeWav(wav, seconds, seed, args.prompt)
            execFileSync(
              "ffmpeg",
              ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "frame_%04d.ppm"), "-i", wav,
               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", out],
              { timeout: 180_000 },
            )
            return `Видео (процедурное, ${seconds}s, ${w}×${h}): ${out}`
          } finally {
            rmSync(dir, { recursive: true, force: true })
          }
        },
      }),

      image_describe: tool({
        description: "Описать изображение локальной vision-моделью Ollama (moondream).",
        args: {
          path: tool.schema.string(),
          prompt: tool.schema.string().default("Describe this image in detail."),
          model: tool.schema.string().optional(),
        },
        async execute(args) {
          const file = path.resolve(String(args.path).replace(/^~(?=$|\/)/, homedir()))
          if (!existsSync(file)) return `Не найдено: ${file}`
          const base = process.env.OLLAMA_URL || "http://127.0.0.1:11434"
          const model = args.model || process.env.OLLAMA_VISION_MODEL || "moondream2-local:latest"
          try {
            const res = await fetch(`${base}/api/generate`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ model, prompt: args.prompt, images: [readFileSync(file).toString("base64")], stream: false }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            return data?.response || "(пусто)"
          } catch (e) {
            return `Ошибка описания: ${e.message}`
          }
        },
      }),
    },
  }
}
