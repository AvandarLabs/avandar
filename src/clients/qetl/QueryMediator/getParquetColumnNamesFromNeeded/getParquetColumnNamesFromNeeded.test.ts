/** Maps query-facing column names to Parquet originalName headers. */

import { describe, expect, it } from "vitest";

import { getParquetColumnNamesFromNeeded } from "@/clients/qetl/QueryMediator/getParquetColumnNamesFromNeeded/getParquetColumnNamesFromNeeded";

describe("getParquetColumnNamesFromNeeded", () => {
  it("maps a renamed view name to originalName", () => {
    expect(
      getParquetColumnNamesFromNeeded({
        needed: ["display_status"],
        datasetColumns: [
          { name: "display_status", originalName: "status" },
          { name: "id", originalName: "id" },
        ],
      }),
    ).toEqual(["status"]);
  });

  it("keeps originalName when the query already used it", () => {
    expect(
      getParquetColumnNamesFromNeeded({
        needed: ["status"],
        datasetColumns: [
          { name: "display_status", originalName: "status" },
          { name: "id", originalName: "id" },
        ],
      }),
    ).toEqual(["status"]);
  });

  it("returns 'all' when needed is 'all'", () => {
    expect(
      getParquetColumnNamesFromNeeded({
        needed: "all",
        datasetColumns: [{ name: "a", originalName: "a" }],
      }),
    ).toBe("all");
  });

  it("stores 'all' when the finite set names every originalName", () => {
    expect(
      getParquetColumnNamesFromNeeded({
        needed: ["a", "b"],
        datasetColumns: [
          { name: "a", originalName: "a" },
          { name: "b", originalName: "b" },
        ],
      }),
    ).toBe("all");
  });

  it("passes unknown names through", () => {
    expect(
      getParquetColumnNamesFromNeeded({
        needed: ["ghost"],
        datasetColumns: [{ name: "a", originalName: "a" }],
      }),
    ).toEqual(["ghost"]);
  });
});
