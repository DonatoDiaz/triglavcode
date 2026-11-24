import { For, Show, createMemo } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useLanguage } from "@/context/language"
import { useSessionLayout } from "@/pages/session/session-layout"
import "./builtins"
import { webPluginWidgets } from "./registry"
import type { WebPluginSlot } from "./types"

export function PluginSlot(props: { slot: WebPluginSlot; sessionID?: string; exclude?: string[] }) {
  const widgets = createMemo(() =>
    webPluginWidgets(props.slot).filter((widget) => !props.exclude?.includes(widget.id)),
  )
  return <For each={widgets()}>{(widget) => <Dynamic component={widget.component} sessionID={props.sessionID} />}</For>
}

export function SessionPluginsPanel(props: { exclude?: string[] }) {
  const language = useLanguage()
  const { params } = useSessionLayout()
  const has = createMemo(() => webPluginWidgets("session_sidebar").some((widget) => !props.exclude?.includes(widget.id)))

  return (
    <Show when={has()}>
      <div class="shrink-0 max-h-[45%] overflow-auto border-t border-border-weak-base flex flex-col gap-2.5 p-3">
        <div class="text-11-medium uppercase tracking-wide text-text-weaker">{language.t("status.popover.tab.plugins")}</div>
        <PluginSlot slot="session_sidebar" sessionID={params.id} exclude={props.exclude} />
      </div>
    </Show>
  )
}

export function HomePluginsPanel() {
  const has = createMemo(() => webPluginWidgets("home_bottom").length > 0)
  return (
    <Show when={has()}>
      <div class="mt-16 flex flex-col gap-3">
        <PluginSlot slot="home_bottom" />
      </div>
    </Show>
  )
}
