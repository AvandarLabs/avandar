import { describe, expect, it } from "vitest";
import { GADGET_TYPES, isGadgetRef } from "$/models/gadgets/Gadget/Gadget.ts";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

describe("Gadget", () => {
  it("lists the six gadget types", () => {
    expect(GADGET_TYPES).toEqual([
      "dashboard",
      "dashboard_tile",
      "dataset",
      "map",
      "concept",
      "individual",
    ]);
  });

  it("accepts a tile ref only with a sub id", () => {
    expect(
      isGadgetRef({
        gadgetType: "dashboard_tile",
        gadgetId: DASHBOARD_ID,
        subId: "DataViz-1",
      }),
    ).toBe(true);
    expect(
      isGadgetRef({
        gadgetType: "dashboard_tile",
        gadgetId: DASHBOARD_ID,
        subId: null,
      }),
    ).toBe(false);
  });

  it("rejects a sub id on other types, unknown types, and non-uuid ids", () => {
    expect(
      isGadgetRef({
        gadgetType: "dashboard",
        gadgetId: DASHBOARD_ID,
        subId: null,
      }),
    ).toBe(true);
    expect(
      isGadgetRef({
        gadgetType: "dashboard",
        gadgetId: DASHBOARD_ID,
        subId: "x",
      }),
    ).toBe(false);
    expect(
      isGadgetRef({ gadgetType: "query", gadgetId: DASHBOARD_ID, subId: null }),
    ).toBe(false);
    expect(
      isGadgetRef({ gadgetType: "map", gadgetId: "nope", subId: null }),
    ).toBe(false);
  });
});
