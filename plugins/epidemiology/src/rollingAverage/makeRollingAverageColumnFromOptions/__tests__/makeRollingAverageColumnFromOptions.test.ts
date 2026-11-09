import { describe, expect, it } from "vitest";
import { makeRollingAverageColumnFromOptions } from "../makeRollingAverageColumnFromOptions";
import type { RollingWindow } from "../makeRollingAverageColumnFromOptions";
import type { DerivedColumn } from "@avandar/plugin-sdk";

function _makeColumn(
  options: Readonly<{
    valueColumn?: string;
    window?: RollingWindow;
    groupByColumn?: string;
  }>,
): DerivedColumn {
  return makeRollingAverageColumnFromOptions({
    valueColumn: options.valueColumn ?? "cases",
    dateColumn: "report_date",
    window: options.window ?? { size: 7, unit: "day" },
    groupByColumn: options.groupByColumn,
  });
}

describe("makeRollingAverageColumnFromOptions", () => {
  it.each([
    [{ size: 7, unit: "day" }, "cases_7d_avg"],
    [{ size: 14, unit: "day" }, "cases_14d_avg"],
    [{ size: 2, unit: "week" }, "cases_2w_avg"],
  ] as const)("names a %o window %s", (window, name) => {
    expect(_makeColumn({ window }).name).toBe(name);
  });

  it("slugs the value column's name", () => {
    expect(_makeColumn({ valueColumn: "New Cases" }).name).toBe(
      "new_cases_7d_avg",
    );
    expect(_makeColumn({ valueColumn: "2024" }).name).toBe("c_2024_7d_avg");
  });

  it.each([
    [{ size: 1, unit: "day" }, "INTERVAL 0 DAY"],
    [{ size: 7, unit: "day" }, "INTERVAL 6 DAY"],
    [{ size: 1, unit: "week" }, "INTERVAL 6 DAY"],
    [{ size: 2, unit: "week" }, "INTERVAL 13 DAY"],
  ] as const)(
    "reaches back the window minus one day for %o",
    (window, text) => {
      expect(_makeColumn({ window }).expression).toContain(
        `RANGE BETWEEN ${text} PRECEDING AND CURRENT ROW`,
      );
    },
  );

  it("partitions by the group-by column when there is one", () => {
    const column = _makeColumn({ groupByColumn: "borough" });
    expect(column.expression).toBe(
      "avg({value}) OVER (PARTITION BY {group} ORDER BY {date} " +
        "RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)",
    );
    expect(column.inputs).toEqual({
      value: "cases",
      date: "report_date",
      group: "borough",
    });
  });

  it("omits PARTITION BY without a group-by column", () => {
    const column = _makeColumn({});
    expect(column.expression).toBe(
      "avg({value}) OVER (ORDER BY {date} " +
        "RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)",
    );
    expect(column.inputs).toEqual({ value: "cases", date: "report_date" });
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects a window size of %s", (size) => {
    expect(() => {
      _makeColumn({ window: { size, unit: "day" } });
    }).toThrow(RangeError);
  });
});
