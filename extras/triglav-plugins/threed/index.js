/**
 * TriglavCode — 3D и игры.
 *
 * - stl_from_prompt: параметрическая генерация STL по промпту (box/sphere/cylinder/cone/torus/vase),
 *   чистый JS, без внешних зависимостей. Для 3D-печати (единицы — мм).
 * - stl_info: разбор STL (бинарный/ASCII): треугольники, bbox, площадь, объём, «watertight».
 * - blender_render: headless-рендер сцены Blender (bpy): по промпту или свой python-скрипт.
 *
 * Env: TRIGLAV_3D_DIR (каталог вывода), BLENDER_BIN (по умолчанию blender)
 * Инструменты: stl_from_prompt, stl_info, blender_render
 */
import { tool } from "@opencode-ai/plugin"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { homedir } from "node:os"
import path from "node:path"
import { STATE_DIR, ensureDir } from "../_shared/tc.js"

const OUT_DIR = process.env.TRIGLAV_3D_DIR || path.join(STATE_DIR, "3d")
const BLENDER = process.env.BLENDER_BIN || "blender"

function outp(out, ext) {
  ensureDir(OUT_DIR)
  if (out) {
    const resolved = path.resolve(String(out).replace(/^~(?=$|\/)/, homedir()))
    mkdirSync(path.dirname(resolved), { recursive: true })
    return resolved
  }
  return path.join(OUT_DIR, `model_${Date.now()}.${ext}`)
}

// ---------- mesh ----------
function hexSeed(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function box(w, h, d) {
  const v = [
    [0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0],
    [0, 0, h], [w, 0, h], [w, d, h], [0, d, h],
  ]
  const f = [
    [0, 3, 2], [0, 2, 1],
    [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4],
    [3, 7, 6], [3, 6, 2],
    [0, 4, 7], [0, 7, 3],
    [1, 2, 6], [1, 6, 5],
  ]
  return f.map(([a, b, c]) => [v[a], v[b], v[c]])
}

function sphere(r, seg = 32, rings = 16) {
  const verts = []
  for (let i = 0; i <= rings; i++) {
    const phi = (i / rings) * Math.PI
    for (let j = 0; j <= seg; j++) {
      const theta = (j / seg) * Math.PI * 2
      verts.push([r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r - r * Math.cos(phi)])
    }
  }
  const tris = []
  const idx = (i, j) => i * (seg + 1) + j
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = idx(i, j), b = idx(i + 1, j), c = idx(i + 1, j + 1), d = idx(i, j + 1)
      tris.push([verts[a], verts[b], verts[c]])
      tris.push([verts[a], verts[c], verts[d]])
    }
  }
  return tris
}

function cylinder(r, h, seg = 48) {
  const tris = []
  const top = []
  const bot = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    bot.push([r * Math.cos(a), r * Math.sin(a), 0])
    top.push([r * Math.cos(a), r * Math.sin(a), h])
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg
    tris.push([bot[i], bot[j], top[j]])
    tris.push([bot[i], top[j], top[i]])
  }
  const cb = [0, 0, 0]
  const ct = [0, 0, h]
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg
    tris.push([cb, bot[j], bot[i]])
    tris.push([ct, top[i], top[j]])
  }
  return tris
}

function cone(r, h, seg = 48) {
  const tris = []
  const base = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    base.push([r * Math.cos(a), r * Math.sin(a), 0])
  }
  const apex = [0, 0, h]
  const cb = [0, 0, 0]
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg
    tris.push([base[i], base[j], apex])
    tris.push([cb, base[j], base[i]])
  }
  return tris
}

function torus(R, r, su = 48, sv = 24) {
  const verts = []
  for (let i = 0; i < su; i++) {
    const u = (i / su) * Math.PI * 2
    for (let j = 0; j < sv; j++) {
      const v = (j / sv) * Math.PI * 2
      const x = (R + r * Math.cos(v)) * Math.cos(u)
      const y = (R + r * Math.cos(v)) * Math.sin(u)
      const z = r + r * Math.sin(v)
      verts.push([x, y, z])
    }
  }
  const tris = []
  const idx = (i, j) => (i % su) * sv + (j % sv)
  for (let i = 0; i < su; i++) {
    for (let j = 0; j < sv; j++) {
      const a = idx(i, j), b = idx(i + 1, j), c = idx(i + 1, j + 1), d = idx(i, j + 1)
      tris.push([verts[a], verts[b], verts[c]])
      tris.push([verts[a], verts[c], verts[d]])
    }
  }
  return tris
}

function vase(rBase, h, seg = 64, rings = 32) {
  const tris = []
  const verts = []
  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    const z = t * h
    const r = rBase * (0.6 + 0.5 * Math.sin(t * Math.PI)) + rBase * 0.15
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2
      verts.push([r * Math.cos(a), r * Math.sin(a), z])
    }
  }
  const idx = (i, j) => i * (seg + 1) + j
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = idx(i, j), b = idx(i + 1, j), c = idx(i + 1, j + 1), d = idx(i, j + 1)
      tris.push([verts[a], verts[b], verts[c]])
      tris.push([verts[a], verts[c], verts[d]])
    }
  }
  // bottom cap
  for (let j = 0; j < seg; j++) {
    tris.push([[0, 0, 0], verts[idx(0, j + 1)], verts[idx(0, j)]])
  }
  return tris
}

function parseModel(prompt) {
  const p = String(prompt).toLowerCase()
  const num = (re, def) => {
    const m = p.match(re)
    return m ? Number(m[1]) : def
  }
  const anySize = num(/(\d+(?:\.\d+)?)\s*mm/, null)
  if (/(sphere|шар|сфер)/.test(p)) return { shape: "sphere", r: num(/\br\s*=?\s*(\d+(?:\.\d+)?)/, anySize ? anySize / 2 : 15) }
  if (/(cylinder|цилиндр)/.test(p)) return { shape: "cylinder", r: num(/\br\s*=?\s*(\d+(?:\.\d+)?)/, anySize ? anySize / 2 : 10), h: num(/(?:h|height|высот\w*)\s*=?\s*(\d+(?:\.\d+)?)/, anySize || 30) }
  if (/(cone|конус)/.test(p)) return { shape: "cone", r: num(/\br\s*=?\s*(\d+(?:\.\d+)?)/, anySize ? anySize / 2 : 15), h: num(/(?:h|height|высот\w*)\s*=?\s*(\d+(?:\.\d+)?)/, anySize || 30) }
  if (/(torus|тор|кольц|donut|пончик)/.test(p)) return { shape: "torus", R: num(/\bR\s*=?\s*(\d+(?:\.\d+)?)/, 20), r: num(/\br\s*=?\s*(\d+(?:\.\d+)?)/, 6) }
  if (/(vase|ваз)/.test(p)) return { shape: "vase", r: num(/\br\s*=?\s*(\d+(?:\.\d+)?)/, anySize ? anySize / 2 : 18), h: num(/(?:h|height|высот\w*)\s*=?\s*(\d+(?:\.\d+)?)/, anySize || 60) }
  // default box
  return {
    shape: "box",
    w: num(/(?:w|width|ширин\w*)\s*=?\s*(\d+(?:\.\d+)?)/, anySize || 30),
    h: num(/(?:h|height|высот\w*)\s*=?\s*(\d+(?:\.\d+)?)/, anySize || 30),
    d: num(/(?:d|depth|глубин\w*)\s*=?\s*(\d+(?:\.\d+)?)/, anySize || 30),
  }
}

function buildMesh(spec) {
  if (spec.shape === "sphere") return { tris: sphere(spec.r), name: "sphere" }
  if (spec.shape === "cylinder") return { tris: cylinder(spec.r, spec.h), name: "cylinder" }
  if (spec.shape === "cone") return { tris: cone(spec.r, spec.h), name: "cone" }
  if (spec.shape === "torus") return { tris: torus(spec.R, spec.r), name: "torus" }
  if (spec.shape === "vase") return { tris: vase(spec.r, spec.h), name: "vase" }
  return { tris: box(spec.w, spec.h, spec.d), name: "box" }
}

function normal(t) {
  const [a, b, c] = t
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  const len = Math.hypot(n[0], n[1], n[2]) || 1
  return [n[0] / len, n[1] / len, n[2] / len]
}

function writeSTL(file, tris) {
  const header = Buffer.alloc(80)
  header.write("TriglavCode STL", 0)
  const count = Buffer.alloc(4)
  count.writeUInt32LE(tris.length, 0)
  const body = Buffer.alloc(tris.length * 50)
  let o = 0
  for (const t of tris) {
    const n = normal(t)
    for (const value of n) {
      body.writeFloatLE(value, o)
      o += 4
    }
    for (const vertex of t) {
      for (const value of vertex) {
        body.writeFloatLE(value, o)
        o += 4
      }
    }
    body.writeUInt16LE(0, o)
    o += 2
  }
  writeFileSync(file, Buffer.concat([header, count, body]))
}

// ---------- STL read/info ----------
function readSTL(file) {
  const buf = readFileSync(file)
  // ascii?
  const head = buf.subarray(0, 64).toString("utf8").trim().toLowerCase()
  if (head.startsWith("solid") && buf.includes(Buffer.from("facet"))) {
    const text = buf.toString("utf8")
    const tris = []
    const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g
    let m
    let current = []
    while ((m = re.exec(text))) {
      current.push([Number(m[1]), Number(m[2]), Number(m[3])])
      if (current.length === 3) {
        tris.push(current)
        current = []
      }
    }
    return tris
  }
  if (buf.length < 84) return []
  const n = buf.readUInt32LE(80)
  const tris = []
  let o = 84
  for (let i = 0; i < n && o + 50 <= buf.length; i++) {
    o += 12 // normal
    const tri = []
    for (let v = 0; v < 3; v++) {
      tri.push([buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)])
      o += 12
    }
    o += 2
    tris.push(tri)
  }
  return tris
}

function meshStats(tris) {
  let min = [Infinity, Infinity, Infinity]
  let max = [-Infinity, -Infinity, -Infinity]
  let area = 0
  let volume = 0
  const edges = new Map()
  const key = (v) => v.map((x) => Math.round(x * 1e3) / 1e3).join(",")
  for (const [a, b, c] of tris) {
    for (const v of [a, b, c]) {
      for (let i = 0; i < 3; i++) {
        if (v[i] < min[i]) min[i] = v[i]
        if (v[i] > max[i]) max[i] = v[i]
      }
    }
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    area += Math.hypot(cr[0], cr[1], cr[2]) / 2
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const k = [key(p), key(q)].sort().join("|")
      edges.set(k, (edges.get(k) || 0) + 1)
    }
  }
  let nonManifold = 0
  for (const count of edges.values()) if (count !== 2) nonManifold++
  return {
    triangles: tris.length,
    bbox: { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] },
    area,
    volume: Math.abs(volume),
    nonManifoldEdges: nonManifold,
    watertight: nonManifold === 0,
  }
}

// ---------- blender ----------
function blenderEnv() {
  const env = { ...process.env }
  const base = "/opt/intel/oneapi/compiler"
  try {
    for (const version of readdirSync(base)) {
      const lib = path.join(base, version, "lib")
      if (existsSync(path.join(lib, "libsycl.so.8")) || existsSync(path.join(lib, "libsycl.so"))) {
        env.LD_LIBRARY_PATH = [lib, env.LD_LIBRARY_PATH].filter(Boolean).join(":")
        break
      }
    }
  } catch {}
  return env
}

function blenderSceneScript({ prompt, out, samples, width, height }) {
  const color = (hexSeed(prompt) % 360) / 360
  return `import bpy, math, colorsys
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
# ground
bpy.ops.mesh.primitive_plane_add(size=40, location=(0,0,0))
plane = bpy.context.object
mat = bpy.data.materials.new("ground"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.05,0.04,0.07,1)
plane.data.materials.append(mat)
# subject
hue = ${color}
r,g,b = colorsys.hsv_to_rgb(hue, 0.7, 0.9)
bpy.ops.mesh.primitive_uv_sphere_add(radius=4, location=(0,0,4))
obj = bpy.context.object
m = bpy.data.materials.new("subject"); m.use_nodes = True
bsdf = m.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (r,g,b,1)
bsdf.inputs["Roughness"].default_value = 0.35
bsdf.inputs["Metallic"].default_value = 0.4
obj.data.materials.append(m)
# camera
bpy.ops.object.camera_add(location=(12,-12,9))
cam = bpy.context.object
scene.camera = cam
constraint = cam.constraints.new(type='TRACK_TO')
# point camera at origin
import mathutils
direction = mathutils.Vector((0,0,3)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z','Y').to_euler()
# lights
bpy.ops.object.light_add(type='AREA', location=(8,-6,12))
key = bpy.context.object; key.data.energy = 1200; key.data.size = 8
bpy.ops.object.light_add(type='AREA', location=(-8,-4,6))
fill = bpy.context.object; fill.data.energy = 400; fill.data.size = 6
bpy.ops.object.light_add(type='POINT', location=(0,8,10))
rim = bpy.context.object; rim.data.energy = 600
# render
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.render.resolution_x = ${width || 1024}
scene.render.resolution_y = ${height || 768}
scene.render.filepath = ${JSON.stringify(out)}
bpy.ops.render.render(write_still=True)
print("TRIGLAV_RENDER_OK", ${JSON.stringify(out)})
`
}

export default async () => {
  return {
    tool: {
      stl_from_prompt: tool({
        description:
          "Сгенерировать STL-модель по промпту (box/sphere/cylinder/cone/torus/vase). Размеры в мм: 'куб 30mm', 'sphere r20', 'cylinder r10 h40', 'vase h60'.",
        args: {
          prompt: tool.schema.string(),
          out: tool.schema.string().optional(),
        },
        async execute(args) {
          const spec = parseModel(args.prompt)
          const { tris, name } = buildMesh(spec)
          const file = outp(args.out, "stl")
          writeSTL(file, tris)
          const stats = meshStats(tris)
          return [
            `STL (${name}) → ${file}`,
            `Треугольников: ${stats.triangles}, размер: ${stats.bbox.size.map((v) => v.toFixed(1)).join(" × ")} мм`,
            `Объём: ${(stats.volume / 1000).toFixed(2)} см³, watertight: ${stats.watertight ? "да" : "нет"}`,
          ].join("\n")
        },
      }),

      stl_info: tool({
        description: "Проанализировать STL: треугольники, габариты, площадь, объём, watertight.",
        args: { path: tool.schema.string() },
        async execute(args) {
          const file = path.resolve(String(args.path).replace(/^~(?=$|\/)/, homedir()))
          if (!existsSync(file)) return `Не найдено: ${file}`
          const tris = readSTL(file)
          if (!tris.length) return "Не удалось разобрать STL."
          const s = meshStats(tris)
          return [
            `Файл: ${file}`,
            `Треугольников: ${s.triangles}`,
            `Габариты: ${s.bbox.size.map((v) => v.toFixed(2)).join(" × ")} (min ${s.bbox.min.map((v) => v.toFixed(1)).join(",")})`,
            `Площадь: ${s.area.toFixed(1)} мм²`,
            `Объём: ${(s.volume / 1000).toFixed(2)} см³`,
            `Watertight: ${s.watertight ? "да" : `нет (рёбер с !=2 гранями: ${s.nonManifoldEdges})`}`,
          ].join("\n")
        },
      }),

      blender_render: tool({
        description:
          "Headless-рендер сцены Blender (bpy). Можно передать свой python-код (bpy) или промпт — сгенерируется простая сцена.",
        args: {
          prompt: tool.schema.string().optional(),
          python: tool.schema.string().optional().describe("Свой bpy-скрипт (переопределяет prompt)"),
          out: tool.schema.string().optional(),
          width: tool.schema.number().int().min(64).max(4096).default(1024),
          height: tool.schema.number().int().min(64).max(4096).default(768),
        },
        async execute(args) {
          const out = outp(args.out, "png")
          const script = args.python || blenderSceneScript({ prompt: args.prompt || "scene", out, width: args.width, height: args.height })
          const scriptPath = path.join(OUT_DIR, `scene_${Date.now()}.py`)
          writeFileSync(scriptPath, script)
          try {
            execFileSync(BLENDER, ["-b", "--factory-startup", "-P", scriptPath], { timeout: 300_000, maxBuffer: 16 * 1024 * 1024, env: blenderEnv() })
          } catch (error) {
            const msg = (error?.stderr || error?.message || "").toString().slice(0, 400)
            return `Blender недоступен или ошибка: ${msg}\n(скрипт: ${scriptPath})`
          }
          return existsSync(out)
            ? `Рендер: ${out}\n(скрипт: ${scriptPath})`
            : `Blender выполнился, но файл не найден: ${out}\n(скрипт: ${scriptPath})`
        },
      }),
    },
  }
}
