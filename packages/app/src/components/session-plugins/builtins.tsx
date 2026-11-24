import { registerWebPluginWidget } from "./registry"
import {
  FilesWidget,
  HomeFooterWidget,
  HomeTipsWidget,
  LspWidget,
  McpWidget,
  SessionFooterWidget,
  TodoWidget,
} from "./widgets"

registerWebPluginWidget({ id: "internal:sidebar-todo", slot: "session_sidebar", order: 100, component: TodoWidget })
registerWebPluginWidget({ id: "internal:sidebar-mcp", slot: "session_sidebar", order: 200, component: McpWidget })
registerWebPluginWidget({ id: "internal:sidebar-lsp", slot: "session_sidebar", order: 300, component: LspWidget })
registerWebPluginWidget({ id: "internal:sidebar-files", slot: "session_sidebar", order: 400, component: FilesWidget })
registerWebPluginWidget({
  id: "internal:sidebar-footer",
  slot: "session_sidebar",
  order: 900,
  component: SessionFooterWidget,
})

registerWebPluginWidget({ id: "internal:home-tips", slot: "home_bottom", order: 100, component: HomeTipsWidget })
registerWebPluginWidget({ id: "internal:home-footer", slot: "home_bottom", order: 900, component: HomeFooterWidget })
