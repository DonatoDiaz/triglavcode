import { For, Show, createMemo, createSignal, type JSX } from "solid-js"
import { useLanguage } from "@/context/language"
import { useSDK } from "@/context/sdk"
import { useSync } from "@/context/sync"
import type { WebPluginWidgetProps } from "./types"

function WidgetCard(props: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: JSX.Element
}) {
  const [open, setOpen] = createSignal(props.defaultOpen ?? true)
  return (
    <div class="flex flex-col gap-1">
      <button
        type="button"
        class="flex items-center gap-1.5 text-left select-none"
        onClick={() => setOpen((value) => !value)}
      >
        <span class="text-11-regular text-text-weaker">{open() ? "▾" : "▸"}</span>
        <span class="text-12-medium text-text-strong">{props.title}</span>
        <Show when={typeof props.count === "number" && props.count! > 0}>
          <span class="text-11-regular text-text-weaker">({props.count})</span>
        </Show>
      </button>
      <Show when={open()}>{props.children}</Show>
    </div>
  )
}

function Dot(props: { tone: "success" | "error" | "warning" | "muted" }) {
  return (
    <span
      classList={{
        "size-1.5 rounded-full shrink-0 mt-[5px]": true,
        "bg-icon-success-base": props.tone === "success",
        "bg-icon-critical-base": props.tone === "error",
        "bg-icon-warning-base": props.tone === "warning",
        "bg-border-weak-base": props.tone === "muted",
      }}
    />
  )
}

export function TodoWidget(props: WebPluginWidgetProps) {
  const sync = useSync()
  const language = useLanguage()
  const list = createMemo(() => (props.sessionID ? (sync().data.todo?.[props.sessionID] ?? []) : []))
  const done = createMemo(() => list().filter((item) => item.status === "completed").length)

  return (
    <Show when={list().length > 0}>
      <WidgetCard title={language.t("session.todo.title")} count={list().length}>
        <div class="flex flex-col gap-1">
          <span class="text-11-regular text-text-weaker">
            {language.t("session.todo.progress", { done: done(), total: list().length })}
          </span>
          <For each={list()}>
            {(item) => (
              <div class="flex items-start gap-2">
                <Dot
                  tone={
                    item.status === "completed"
                      ? "success"
                      : item.status === "in_progress"
                        ? "warning"
                        : item.status === "cancelled"
                          ? "muted"
                          : "muted"
                  }
                />
                <span
                  class="text-11-regular text-text-weak"
                  classList={{
                    "line-through text-text-weaker": item.status === "completed" || item.status === "cancelled",
                  }}
                >
                  {item.content}
                </span>
              </div>
            )}
          </For>
        </div>
      </WidgetCard>
    </Show>
  )
}

export function McpWidget() {
  const sync = useSync()
  const language = useLanguage()
  const names = createMemo(() => Object.keys(sync().data.mcp ?? {}).sort())
  const status = (name: string) => sync().data.mcp?.[name]?.status

  const tone = (name: string): "success" | "error" | "warning" | "muted" => {
    const value = status(name)
    if (value === "connected") return "success"
    if (value === "failed" || value === "needs_client_registration") return "error"
    if (value === "needs_auth") return "warning"
    return "muted"
  }

  return (
    <Show when={names().length > 0}>
      <WidgetCard title={language.t("status.popover.tab.mcp")} count={names().length}>
        <div class="flex flex-col gap-1">
          <For each={names()}>
            {(name) => (
              <div class="flex items-start gap-2">
                <Dot tone={tone(name)} />
                <span class="text-11-regular text-text-weak truncate">{name}</span>
              </div>
            )}
          </For>
        </div>
      </WidgetCard>
    </Show>
  )
}

export function LspWidget() {
  const sync = useSync()
  const language = useLanguage()
  const list = createMemo(() => sync().data.lsp ?? [])

  return (
    <WidgetCard title={language.t("status.popover.tab.lsp")} count={list().length}>
      <Show
        when={list().length > 0}
        fallback={<span class="text-11-regular text-text-weaker">{language.t("dialog.lsp.empty")}</span>}
      >
        <div class="flex flex-col gap-1">
          <For each={list()}>
            {(item) => (
              <div class="flex items-start gap-2">
                <Dot tone={item.status === "connected" ? "success" : "error"} />
                <span class="text-11-regular text-text-weak truncate">{item.name || item.id}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </WidgetCard>
  )
}

export function FilesWidget(props: WebPluginWidgetProps) {
  const sync = useSync()
  const language = useLanguage()
  const list = createMemo(() => (props.sessionID ? (sync().data.session_diff?.[props.sessionID] ?? []) : []))

  return (
    <Show when={list().length > 0}>
      <WidgetCard title={language.t("session.review.filesChanged", { count: list().length })}>
        <div class="flex flex-col gap-1">
          <For each={list()}>
            {(item) => (
              <div class="flex items-center justify-between gap-2">
                <span class="text-11-regular text-text-weak truncate">{item.file}</span>
                <span class="flex items-center gap-1 shrink-0 text-11-regular">
                  <Show when={item.additions > 0}>
                    <span class="text-icon-success-base">+{item.additions}</span>
                  </Show>
                  <Show when={item.deletions > 0}>
                    <span class="text-icon-critical-base">-{item.deletions}</span>
                  </Show>
                </span>
              </div>
            )}
          </For>
        </div>
      </WidgetCard>
    </Show>
  )
}

export function SessionFooterWidget() {
  const sdk = useSDK()
  return (
    <div class="flex flex-col gap-0.5 pt-1">
      <span class="text-11-regular text-text-weak truncate" title={sdk().directory}>
        {sdk().directory}
      </span>
      <span class="text-11-regular text-text-weaker">TriglavCode</span>
    </div>
  )
}

export function HomeTipsWidget() {
  const language = useLanguage()
  return (
    <div class="flex flex-col gap-1.5 rounded-md border border-border-weak-base bg-background-base p-3">
      <span class="text-12-medium text-text-strong">{language.t("command.provider.connect")}</span>
      <span class="text-11-regular text-text-weak">{language.t("home.providerTip")}</span>
      <span class="text-11-regular text-text-weaker">
        <code class="font-mono text-text-base">/connect</code>
      </span>
    </div>
  )
}

export function HomeFooterWidget() {
  return (
    <div class="flex items-center justify-center gap-1.5 text-11-regular text-text-weaker">
      <span class="size-1.5 rounded-full bg-icon-success-base" />
      <span class="text-text-base">TriglavCode</span>
    </div>
  )
}
