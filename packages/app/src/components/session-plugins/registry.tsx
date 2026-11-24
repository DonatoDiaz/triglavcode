import { createSignal } from "solid-js"
import type { WebPluginSlot, WebPluginWidget } from "./types"

const [registered, setRegistered] = createSignal<WebPluginWidget[]>([])

export function registerWebPluginWidget(widget: WebPluginWidget) {
  setRegistered((list) => (list.some((item) => item.id === widget.id) ? list : [...list, widget]))
  return () => setRegistered((list) => list.filter((item) => item.id !== widget.id))
}

export function webPluginWidgets(slot: WebPluginSlot) {
  return registered()
    .filter((item) => item.slot === slot)
    .sort((a, b) => a.order - b.order)
}
