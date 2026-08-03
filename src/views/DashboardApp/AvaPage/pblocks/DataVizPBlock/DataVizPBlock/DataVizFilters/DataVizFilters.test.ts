import { describe, expect, it } from "vitest";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

const REGION: DashboardFilterRecord = {
  filterId: "f-region",
  columnName: "region",
  label: "Region",
  operator: "equals",
  value: undefined,
};
const NAME: DashboardFilterRecord = {
  filterId: "f-name",
  columnName: "name",
  label: "Name",
  operator: "contains",
  value: undefined,
};

describe("resolveSubscribedFilterIds", () => {
  it("returns undefined for mode=all (means: subscribe to every filter)", () => {
    expect(
      DataVizFilters.resolveSubscribedFilterIds({
        subscription: { mode: "all", subscribedFilterIds: [] },
        registeredFilters: [REGION, NAME],
      }),
    ).toBeUndefined();
  });

  it("returns an empty array for mode=none", () => {
    expect(
      DataVizFilters.resolveSubscribedFilterIds({
        subscription: { mode: "none", subscribedFilterIds: ["f-region"] },
        registeredFilters: [REGION, NAME],
      }),
    ).toEqual([]);
  });

  it("returns the explicit list for mode=selected", () => {
    expect(
      DataVizFilters.resolveSubscribedFilterIds({
        subscription: { mode: "selected", subscribedFilterIds: ["f-region"] },
        registeredFilters: [REGION, NAME],
      }),
    ).toEqual(["f-region"]);
  });

  it("drops subscribed ids that no longer exist in registered filters", () => {
    expect(
      DataVizFilters.resolveSubscribedFilterIds({
        subscription: {
          mode: "selected",
          subscribedFilterIds: ["f-region", "f-deleted", "f-name"],
        },
        registeredFilters: [REGION, NAME],
      }),
    ).toEqual(["f-region", "f-name"]);
  });
});

describe("parseLocalFilterOptions", () => {
  it("splits on commas and trims whitespace", () => {
    expect(DataVizFilters.parseLocalFilterOptions("  a, b ,c  ")).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("drops empty entries", () => {
    expect(DataVizFilters.parseLocalFilterOptions(",,a,,b")).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("parseLocalFilterDefaultValue", () => {
  it("returns a string for single-select modes", () => {
    expect(
      DataVizFilters.parseLocalFilterDefaultValue({
        defaultValue: "Lusaka",
        mode: "select_single",
      }),
    ).toBe("Lusaka");
  });
  it("returns undefined for empty single-select default", () => {
    expect(
      DataVizFilters.parseLocalFilterDefaultValue({
        defaultValue: "",
        mode: "select_single",
      }),
    ).toBeUndefined();
  });
  it("parses multi-select defaults from a JSON array", () => {
    expect(
      DataVizFilters.parseLocalFilterDefaultValue({
        defaultValue: '["a","b"]',
        mode: "select_multi",
      }),
    ).toEqual(["a", "b"]);
  });
  it("parses multi-select defaults from a comma list", () => {
    expect(
      DataVizFilters.parseLocalFilterDefaultValue({
        defaultValue: "a, b",
        mode: "select_multi",
      }),
    ).toEqual(["a", "b"]);
  });
});

describe("localFilterToRecord", () => {
  it("maps select_single -> equals", () => {
    const filterRecord = DataVizFilters.localFilterToRecord({
      filter: {
        id: "lf",
        label: "L",
        columnName: "c",
        mode: "select_single",
        optionsRaw: "",
        defaultValue: "",
      },
      value: "x",
    });
    expect(filterRecord.operator).toBe("equals");
    expect(filterRecord.value).toBe("x");
  });
  it("maps select_multi -> in", () => {
    const filterRecord = DataVizFilters.localFilterToRecord({
      filter: {
        id: "lf",
        label: "L",
        columnName: "c",
        mode: "select_multi",
        optionsRaw: "",
        defaultValue: "",
      },
      value: ["a", "b"],
    });
    expect(filterRecord.operator).toBe("in");
    expect(filterRecord.value).toEqual(["a", "b"]);
  });
  it("maps contains -> contains", () => {
    const filterRecord = DataVizFilters.localFilterToRecord({
      filter: {
        id: "lf",
        label: "L",
        columnName: "c",
        mode: "contains",
        optionsRaw: "",
        defaultValue: "",
      },
      value: "foo",
    });
    expect(filterRecord.operator).toBe("contains");
    expect(filterRecord.value).toBe("foo");
  });
});
