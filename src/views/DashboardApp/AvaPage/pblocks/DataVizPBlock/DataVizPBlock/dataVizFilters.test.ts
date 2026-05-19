import { describe, expect, it } from "vitest";
import {
  localFilterToRecord,
  parseLocalFilterDefaultValue,
  parseLocalFilterOptions,
  resolveSubscribedFilterIds,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";
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
      resolveSubscribedFilterIds(
        { mode: "all", subscribedFilterIds: [] },
        [REGION, NAME],
      ),
    ).toBeUndefined();
  });

  it("returns an empty array for mode=none", () => {
    expect(
      resolveSubscribedFilterIds(
        { mode: "none", subscribedFilterIds: ["f-region"] },
        [REGION, NAME],
      ),
    ).toEqual([]);
  });

  it("returns the explicit list for mode=selected", () => {
    expect(
      resolveSubscribedFilterIds(
        { mode: "selected", subscribedFilterIds: ["f-region"] },
        [REGION, NAME],
      ),
    ).toEqual(["f-region"]);
  });

  it("drops subscribed ids that no longer exist in registered filters", () => {
    expect(
      resolveSubscribedFilterIds(
        {
          mode: "selected",
          subscribedFilterIds: ["f-region", "f-deleted", "f-name"],
        },
        [REGION, NAME],
      ),
    ).toEqual(["f-region", "f-name"]);
  });
});

describe("parseLocalFilterOptions", () => {
  it("splits on commas and trims whitespace", () => {
    expect(parseLocalFilterOptions("  a, b ,c  ")).toEqual(["a", "b", "c"]);
  });
  it("drops empty entries", () => {
    expect(parseLocalFilterOptions(",,a,,b")).toEqual(["a", "b"]);
  });
});

describe("parseLocalFilterDefaultValue", () => {
  it("returns a string for single-select modes", () => {
    expect(parseLocalFilterDefaultValue("Lusaka", "select_single")).toBe(
      "Lusaka",
    );
  });
  it("returns undefined for empty single-select default", () => {
    expect(
      parseLocalFilterDefaultValue("", "select_single"),
    ).toBeUndefined();
  });
  it("parses multi-select defaults from a JSON array", () => {
    expect(
      parseLocalFilterDefaultValue('["a","b"]', "select_multi"),
    ).toEqual(["a", "b"]);
  });
  it("parses multi-select defaults from a comma list", () => {
    expect(parseLocalFilterDefaultValue("a, b", "select_multi")).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("localFilterToRecord", () => {
  it("maps select_single -> equals", () => {
    const rec = localFilterToRecord(
      {
        id: "lf",
        label: "L",
        columnName: "c",
        mode: "select_single",
        optionsRaw: "",
        defaultValue: "",
      },
      "x",
    );
    expect(rec.operator).toBe("equals");
    expect(rec.value).toBe("x");
  });
  it("maps select_multi -> in", () => {
    const rec = localFilterToRecord(
      {
        id: "lf",
        label: "L",
        columnName: "c",
        mode: "select_multi",
        optionsRaw: "",
        defaultValue: "",
      },
      ["a", "b"],
    );
    expect(rec.operator).toBe("in");
    expect(rec.value).toEqual(["a", "b"]);
  });
  it("maps contains -> contains", () => {
    const rec = localFilterToRecord(
      {
        id: "lf",
        label: "L",
        columnName: "c",
        mode: "contains",
        optionsRaw: "",
        defaultValue: "",
      },
      "foo",
    );
    expect(rec.operator).toBe("contains");
    expect(rec.value).toBe("foo");
  });
});
