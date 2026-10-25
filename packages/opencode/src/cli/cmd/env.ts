import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"

const TRIGLAV_ENV_VARS: Record<string, string> = {
  TRIGLAV_SELF_UPDATE: 'включить проверку обновлений (по умолчанию выключено): "1"',
  TRIGLAV_MODELS_URL: "альтернативный источник каталога моделей/провайдеров (модели.dev)",
  TRIGLAV_MODELS_PATH: "путь к локальному файлу каталога моделей вместо URL",
  TRIGLAV_DISABLE_MODELS_FETCH: 'отключить загрузку каталога моделей: "1"',
  TRIGLAV_FALLBACK_MODEL: "запасная модель при недоступности основного провайдера, напр. ollama/qwen2.5:latest",
  TRIGLAV_TOOL_OUTPUT_MAX_CHARS: "максимум символов вывода тулза в контекст (по умолчанию 24000)",
  TRIGLAV_OLLAMA_URL: "базовый URL Ollama для проверки доступности (по умолчанию http://localhost:11434)",
  TRIGLAV_PROBE_URL: "URL проверки доступности основного провайдера для bin/triglav-router",
  TRIGLAV_PROBE_TIMEOUT: "таймаут проверки доступности провайдера в секундах (по умолчанию 5)",
  TRIGLAV_ROUTER: 'выключить авто-роутер: "0"',
  TRIGLAV_BIN: "бинарь для bin/triglav-router (по умолчанию triglavcode)",
}

export const EnvCommand = effectCmd({
  command: "env",
  describe: "показать переменные окружения TriglavCode и их текущие значения",
  builder: (yargs) => yargs.option("all", {
    describe: "показать также не заданные переменные",
    type: "boolean",
    default: false,
  }),
  handler: Effect.fn("Cli.env")(function* (args) {
    for (const [name, description] of Object.entries(TRIGLAV_ENV_VARS)) {
      const value = process.env[name]
      if (value === undefined && !args.all) continue
      const shown = value === undefined ? "(не задана)" : value
      console.log(`${name}=${shown}\n  ${description}`)
    }
  }),
})