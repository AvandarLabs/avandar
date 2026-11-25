import { describe, expect, it } from "vitest";
import {
  getColumnNamesFromColumns,
  NUMERIC_DATA_TYPES,
  TEMPORAL_DATA_TYPES,
} from "./getColumnNamesFromColumns";
import type { DataExplorerToolbarContext } from "@avandar/plugin-sdk";

const COLUMNS: DataExplorerToolbarContext["columns"] = [
  { name: "borough", dataType: "varchar" },
  { name: "cases", dataType: "bigint" },
  { name: "report_date", dataType: "date" },
  { name: "rate", dataType: "double" },
  { name: "reported_at", dataType: "timestamp" },
  { name: "onset_time", dataType: "time" },
];

describe("getColumnNamesFromColumns", () => {
  it("gets whole-number and decimal columns as numeric, in result order", () => {
    expect(
      getColumnNamesFromColumns({
        columns: COLUMNS,
        dataTypes: NUMERIC_DATA_TYPES,
      }),
    ).toEqual(["cases", "rate"]);
  });

  it("gets date and timestamp columns as temporal, but not time of day", () => {
    expect(
      getColumnNamesFromColumns({
        columns: COLUMNS,
        dataTypes: TEMPORAL_DATA_TYPES,
      }),
    ).toEqual(["report_date", "reported_at"]);
  });
});
