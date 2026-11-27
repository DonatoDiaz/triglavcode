import { Effect } from "effect"
import { UI } from "../ui"
import { effectCmd } from "../effect-cmd"
import { hasArg, resolveNetworkOptions, withNetworkOptions } from "../network"
import { randomBytes } from "node:crypto"
import { networkInterfaces } from "node:os"
import open from "open"

function getNetworkIPs() {
  const nets = networkInterfaces()
  const results: string[] = []

  for (const name of Object.keys(nets)) {
    const net = nets[name]
    if (!net) continue

    for (const netInfo of net) {
      // Skip internal and non-IPv4 addresses
      if (netInfo.internal || netInfo.family !== "IPv4") continue
      // Skip Docker bridge networks (typically 172.x.x.x)
      if (netInfo.address.startsWith("172.")) continue
      results.push(netInfo.address)
    }
  }

  return results
}

function randomPassword() {
  return randomBytes(24).toString("base64url")
}

export const PairCommand = effectCmd({
  command: "pair",
  builder: (yargs) =>
    withNetworkOptions(yargs)
      .option("session", {
        alias: ["s"],
        type: "string",
        describe: "ID сессии для шаринга (необязательно)",
      })
      .option("ttl", {
        type: "number",
        describe: "время жизни ссылки в секундах",
        default: 300,
      })
      .option("open", {
        type: "boolean",
        describe: "открыть ссылку в браузере",
        default: false,
      }),
  describe: "поделиться живой сессией по одноразовой ссылке (совместная работа)",
  // The pairing server loads instances per-request, so no ambient project
  // InstanceContext is needed at startup (same as `serve`/`web`).
  instance: false,
  handler: Effect.fn("Cli.pair")(function* (args) {
    const opts = yield* resolveNetworkOptions(args)
    // Pairing is only useful if other devices can reach us. Default to the LAN
    // unless the user explicitly chose a hostname (or mDNS, which implies 0.0.0.0).
    if (!hasArg("--hostname") && !hasArg("--mdns")) opts.hostname = "0.0.0.0"

    // The connect link carries server credentials, so the server must require
    // auth. Generate a throwaway password if the user did not configure one.
    const generatedPassword = !process.env.OPENCODE_SERVER_PASSWORD
    if (generatedPassword) process.env.OPENCODE_SERVER_PASSWORD = randomPassword()

    const { Server } = yield* Effect.promise(() => import("../../server/server"))
    const { Pair } = yield* Effect.promise(() => import("../../server/pair"))

    const server = yield* Effect.promise(() => Server.listen(opts))
    const ttl = Math.max(30, Math.floor(args.ttl ?? 300))
    const ticket = Pair.create({ ttlMs: ttl * 1000, sessionID: args.session })

    const hosts = opts.hostname === "0.0.0.0" ? ["127.0.0.1", ...getNetworkIPs()] : [opts.hostname]
    const links = hosts.map((host) => `http://${host}:${server.port}/auth/connect/${ticket.token}`)

    UI.empty()
    UI.println(UI.logo("  "))
    UI.empty()
    UI.println(UI.Style.TEXT_INFO_BOLD + "  Совместная работа включена.")
    UI.println(UI.Style.TEXT_NORMAL + `  Ссылка одноразовая и действует ${ttl} сек.`)
    if (generatedPassword) {
      UI.println(UI.Style.TEXT_NORMAL + "  Пароль сервера сгенерирован автоматически (только на этот запуск).")
    }
    UI.empty()
    for (const link of links) {
      UI.println(UI.Style.TEXT_INFO_BOLD + "  Ссылка:  ", UI.Style.TEXT_NORMAL, link)
    }
    UI.empty()
    UI.println(
      UI.Style.TEXT_WARNING_BOLD + "!  Ссылка даёт полный доступ к серверу. Передавайте только доверенным людям.",
    )

    if (args.open) open(links[0]).catch(() => {})

    yield* Effect.never
  }),
})
