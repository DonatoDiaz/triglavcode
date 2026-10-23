import { logo, palette } from "../logo"

const reset = "\x1b[0m"
const bold = "\x1b[1m"
const dim = "\x1b[90m"

function color(index: number) {
  const hex = palette[((index % palette.length) + palette.length) % palette.length] ?? palette[0]
  const value = Number.parseInt(hex.slice(1), 16)
  return `\x1b[38;2;${(value >> 16) & 255};${(value >> 8) & 255};${value & 255}m`
}

function wordmark(pad = "") {
  return logo.left.map((line, index) => {
    const left = `${color(index)}${bold}${line}${reset}`
    const right = `${color(palette.length - 1 - index)}${bold}${logo.right[index] ?? ""}${reset}`
    return `${pad}${left} ${right}`
  })
}

export function sessionEpilogue(input: { title: string; sessionID?: string }) {
  const weak = (text: string) => `${dim}${text.padEnd(10, " ")}${reset}`
  return [
    ...wordmark("  "),
    "",
    `  ${weak("Session")}${bold}${input.title}${reset}`,
    `  ${weak("Continue")}${bold}triglavcode -s ${input.sessionID}${reset}`,
    "",
  ].join("\n")
}
