import { expect, test } from "bun:test"
import { registerWebPluginWidget, webPluginWidgets } from "./registry"
import type { WebPluginWidget } from "./types"

const component = () => null
const ids = (slot: "session_sidebar" | "home_bottom") =>
  webPluginWidgets(slot)
    .map((widget) => widget.id)
    .filter((id) => id.startsWith("test:"))

test("registers widgets, orders them and filters by slot", () => {
  const dispose = [
    registerWebPluginWidget({ id: "test:late", slot: "session_sidebar", order: 20, component }),
    registerWebPluginWidget({ id: "test:early", slot: "session_sidebar", order: 10, component }),
    registerWebPluginWidget({ id: "test:home", slot: "home_bottom", order: 5, component } satisfies WebPluginWidget),
  ]

  expect(ids("session_sidebar")).toEqual(["test:early", "test:late"])
  expect(ids("home_bottom")).toEqual(["test:home"])

  dispose.forEach((remove) => remove())
  expect(ids("session_sidebar")).toEqual([])
  expect(ids("home_bottom")).toEqual([])
})

test("ignores duplicate widget ids", () => {
  const remove = registerWebPluginWidget({ id: "test:dup", slot: "session_sidebar", order: 1, component })
  const removeAgain = registerWebPluginWidget({ id: "test:dup", slot: "session_sidebar", order: 99, component })

  expect(ids("session_sidebar").filter((id) => id === "test:dup")).toHaveLength(1)

  removeAgain()
  remove()
  expect(ids("session_sidebar")).toEqual([])
})
