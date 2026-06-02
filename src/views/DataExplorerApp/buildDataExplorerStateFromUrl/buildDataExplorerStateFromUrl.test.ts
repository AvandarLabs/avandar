import { describe, expect, it } from "vitest";
import { buildDataExplorerStateFromUrl } from "@/views/DataExplorerApp/buildDataExplorerStateFromUrl/buildDataExplorerStateFromUrl";

const DS_ID = "2d527857-010e-498f-99af-a7a7c70cef5a";

describe("buildDataExplorerStateFromUrl", () => {
  it("returns an empty object for an empty search", () => {
    expect(buildDataExplorerStateFromUrl({})).toEqual({});
  });

  it("parses ds into dsId", () => {
    const result = buildDataExplorerStateFromUrl({ ds: DS_ID });
    expect(result.dsId).toBe(DS_ID);
  });

  it("parses cols into an array of column names", () => {
    const result = buildDataExplorerStateFromUrl({ cols: "month,total_cases" });
    expect(result.colNames).toEqual(["month", "total_cases"]);
  });

  it("filters empty strings out of cols", () => {
    const result = buildDataExplorerStateFromUrl({ cols: "" });
    expect(result.colNames).toBeUndefined();
  });

  it("parses agg into an aggregations record", () => {
    const result = buildDataExplorerStateFromUrl({
      agg: "total_cases:sum,month:group_by",
    });
    expect(result.aggregations).toEqual({
      total_cases: "sum",
      month: "group_by",
    });
  });

  it("ignores agg pairs with no colon", () => {
    const result = buildDataExplorerStateFromUrl({ agg: "nocolon" });
    expect(result.aggregations).toBeUndefined();
  });

  it("ignores agg pairs with an unrecognised aggregation type", () => {
    const result = buildDataExplorerStateFromUrl({ agg: "col:not_a_real_agg" });
    expect(result.aggregations).toBeUndefined();
  });

  it("parses orderBy and orderDir", () => {
    const result = buildDataExplorerStateFromUrl({
      orderBy: "month",
      orderDir: "asc",
    });
    expect(result.orderByColName).toBe("month");
    expect(result.orderDir).toBe("asc");
  });

  it("parses sql into rawSql", () => {
    const result = buildDataExplorerStateFromUrl({ sql: "SELECT 1" });
    expect(result.rawSql).toBe("SELECT 1");
  });

  it("parses ds, cols, and sql together (legacy combined URLs)", () => {
    const result = buildDataExplorerStateFromUrl({
      ds: DS_ID,
      cols: "month,total_cases",
      sql: "SELECT 1",
    });
    expect(result.dsId).toBe(DS_ID);
    expect(result.colNames).toEqual(["month", "total_cases"]);
    expect(result.rawSql).toBe("SELECT 1");
  });

  it("parses a valid vc JSON string into vizConfig", () => {
    const vc = JSON.stringify({ vizType: "bar", xAxisKey: "month" });
    const result = buildDataExplorerStateFromUrl({ vc });
    expect(result.vizConfig).toMatchObject({ vizType: "bar" });
  });

  it("silently ignores a malformed vc JSON string", () => {
    const result = buildDataExplorerStateFromUrl({ vc: "not-valid-json{{" });
    expect(result.vizConfig).toBeUndefined();
  });

  it("parses a valid od JSON string into openDataset", () => {
    const od = JSON.stringify({
      did: "did-1",
      name: "My Dataset",
      vid: "vid-1",
    });
    const result = buildDataExplorerStateFromUrl({ od });
    expect(result.openDataset).toEqual({
      datasetId: "did-1",
      name: "My Dataset",
      virtualDatasetId: "vid-1",
    });
  });

  it("silently ignores a malformed od JSON string", () => {
    const result = buildDataExplorerStateFromUrl({ od: "{bad-json" });
    expect(result.openDataset).toBeUndefined();
  });
});
