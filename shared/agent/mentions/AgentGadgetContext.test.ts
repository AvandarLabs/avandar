import { describe, expect, it } from "vitest";
import { getAgentGadgetName } from "$/agent/mentions/AgentGadgetContext.ts";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext.ts";

const ID = "11111111-1111-4111-8111-111111111111";

describe("getAgentGadgetName", () => {
  it("names a tile by its title", () => {
    const context: AgentGadgetContext = {
      kind: "dashboard_tile",
      ref: { gadgetType: "dashboard_tile", gadgetId: ID, subId: "b1" },
      dashboardName: "COVID",
      tile: { title: "Weekly cases", chartType: "line", sql: "" },
    };
    expect(getAgentGadgetName(context)).toBe("Weekly cases");
  });

  it("names an unavailable gadget by its type only", () => {
    expect(
      getAgentGadgetName({
        kind: "unavailable",
        ref: { gadgetType: "map", gadgetId: ID, subId: null },
      }),
    ).toBe("an unavailable map");
  });
});
