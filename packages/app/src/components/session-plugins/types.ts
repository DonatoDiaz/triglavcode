import type { Component } from "solid-js"

export type WebPluginSlot = "session_sidebar" | "home_bottom"

export type WebPluginWidgetProps = {
  sessionID?: string
}

export type WebPluginWidget = {
  id: string
  slot: WebPluginSlot
  order: number
  component: Component<WebPluginWidgetProps>
}
