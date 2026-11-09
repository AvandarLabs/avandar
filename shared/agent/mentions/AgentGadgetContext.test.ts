import { describe, expect, it } from "vitest";
import {
  getAgentGadgetName,
  getGadgetTypeName,
} from "$/agent/mentions/AgentGadgetContext.ts";
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

  it("names a dataset by its name", () => {
    expect(
      getAgentGadgetName({
        kind: "dataset",
        ref: { gadgetType: "dataset", gadgetId: ID, subId: null },
        name: "Measles cases",
      }),
    ).toBe("Measles cases");
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

describe("getGadgetTypeName", () => {
  it.each([
    ["dashboard", "a dashboard"],
    ["dashboard_tile", "a chart"],
    ["dataset", "a dataset"],
    ["map", "a map"],
    ["concept", "a case type"],
    ["individual", "a case"],
  ] as const)("names a %s by its type only", (gadgetType, name) => {
    expect(
      getGadgetTypeName({
        gadgetType,
        gadgetId: "11111111-1111-4111-8111-111111111111",
        subId: null,
      }),
    ).toBe(name);
  });
});
