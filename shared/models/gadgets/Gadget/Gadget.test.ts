import { describe, expect, expectTypeOf, it } from "vitest";
import { GADGET_TYPES, isGadgetRef } from "$/models/gadgets/Gadget/Gadget.ts";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget.ts";
import type { Enums } from "$/types/database.types.ts";

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

  it("has exactly the gadget types the database enum has", () => {
    expectTypeOf<Gadget.Type>().toEqualTypeOf<Enums<"gadget_type">>();
  });

  it("accepts a tile ref with a sub id", () => {
    expect(
      isGadgetRef({
        gadgetType: "dashboard_tile",
        gadgetId: DASHBOARD_ID,
        subId: "DataViz-1",
      }),
    ).toBe(true);
  });

  it("rejects a tile ref without a sub id", () => {
    expect(
      isGadgetRef({
        gadgetType: "dashboard_tile",
        gadgetId: DASHBOARD_ID,
        subId: null,
      }),
    ).toBe(false);
  });

  it("accepts a dashboard ref without a sub id", () => {
    expect(
      isGadgetRef({
        gadgetType: "dashboard",
        gadgetId: DASHBOARD_ID,
        subId: null,
      }),
    ).toBe(true);
  });

  it("rejects a sub id on a type other than a tile", () => {
    expect(
      isGadgetRef({
        gadgetType: "dashboard",
        gadgetId: DASHBOARD_ID,
        subId: "x",
      }),
    ).toBe(false);
  });

  it("rejects an unknown gadget type", () => {
    expect(
      isGadgetRef({ gadgetType: "query", gadgetId: DASHBOARD_ID, subId: null }),
    ).toBe(false);
  });

  it("rejects a gadget id that is not a uuid", () => {
    expect(
      isGadgetRef({ gadgetType: "map", gadgetId: "nope", subId: null }),
    ).toBe(false);
  });

  it("rejects a ref with an extra field such as a label", () => {
    expect(
      isGadgetRef({
        gadgetType: "dashboard",
        gadgetId: DASHBOARD_ID,
        subId: null,
        label: "Measles overview",
      }),
    ).toBe(false);
  });
});
