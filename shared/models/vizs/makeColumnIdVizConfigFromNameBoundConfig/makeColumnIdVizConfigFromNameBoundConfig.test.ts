import { propNotEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";
/** Chart output names bind uniquely before renderer resolution. */
import { uuid } from "$/lib/uuid.ts";
import { makeColumnIdVizConfigFromNameBoundConfig } from "$/models/vizs/makeColumnIdVizConfigFromNameBoundConfig/makeColumnIdVizConfigFromNameBoundConfig.ts";
import { makeNameBoundVizConfigFromColumnIdConfig } from "$/models/vizs/makeNameBoundVizConfigFromColumnIdConfig/makeNameBoundVizConfigFromColumnIdConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { ColumnIdVizConfig } from "$/models/vizs/ColumnIdVizConfig/ColumnIdVizConfig.ts";

const REVENUE_ID = uuid<QueryColumn.Id>();
const CATEGORY_ID = uuid<QueryColumn.Id>();
const SIZE_ID = uuid<QueryColumn.Id>();
const COLUMNS: QueryResult.ColumnWithId[] = [
  { id: REVENUE_ID, name: "revenue", dataType: "double" },
  { id: CATEGORY_ID, name: "quarter", dataType: "varchar" },
  { id: SIZE_ID, name: "size", dataType: "double" },
];
const SERIES: { key: string; label: string; color: string } = {
  key: "revenue",
  label: "revenue",
  color: "#123456",
};
const CONFIGS: ColumnIdVizConfig.NameBound[] = [
  {
    vizType: "bar",
    xAxisKey: "quarter",
    series: [{ ...SERIES, renderAs: "line" }],
    layout: "group",
    withLegend: true,
  },
  {
    vizType: "line",
    xAxisKey: "quarter",
    series: [{ ...SERIES, renderAs: "line" }],
    withLegend: true,
  },
  {
    vizType: "area",
    xAxisKey: "quarter",
    series: [{ ...SERIES, renderAs: "area" }],
    layout: "stacked",
    withLegend: true,
  },
  { vizType: "scatter", series: [{ ...SERIES, xKey: "quarter" }] },
  {
    vizType: "bubble",
    series: [{ ...SERIES, xKey: "quarter", sizeKey: "size" }],
  },
  { vizType: "radar", nameKey: "quarter", series: [SERIES] },
  {
    vizType: "pie",
    nameKey: "quarter",
    valueKey: "revenue",
    isDonut: false,
    withLabels: false,
    labelsType: "value",
    seriesColors: { revenue: "red.6" },
  },
  {
    vizType: "funnel",
    nameKey: "quarter",
    valueKey: "revenue",
    seriesColors: { revenue: "red.6" },
  },
  { vizType: "table" },
];

describe("makeColumnIdVizConfigFromNameBoundConfig", () => {
  it.each(CONFIGS)(
    "binds $vizType without changing its style or category values",
    (config) => {
      const result = makeColumnIdVizConfigFromNameBoundConfig({
        config: config,
        columns: COLUMNS,
      });
      expect(result.issues).toEqual([]);
      expect(
        makeNameBoundVizConfigFromColumnIdConfig({
          config: result.config,
          columns: COLUMNS,
        }).config,
      ).toEqual(config);
      if ("series" in config) {
        expect(result.config).toMatchObject({
          series: [{ key: REVENUE_ID, label: "revenue", color: "#123456" }],
        });
      }
      if ("xAxisKey" in config) {
        expect(result.config).toMatchObject({ xAxisKey: CATEGORY_ID });
      }
      if ("nameKey" in config) {
        expect(result.config).toMatchObject({ nameKey: CATEGORY_ID });
      }
      if ("valueKey" in config) {
        expect(result.config).toMatchObject({ valueKey: REVENUE_ID });
      }
    },
  );

  it.each(["Revenue", "revenue"])(
    "rejects ambiguous output name %s without choosing the first column",
    (key) => {
      const config: ColumnIdVizConfig.NameBound = {
        vizType: "line",
        xAxisKey: undefined,
        series: [{ renderAs: "line", key }],
        withLegend: true,
      };
      const original = structuredClone(config);
      const columns = [
        ...COLUMNS,
        {
          id: uuid<QueryColumn.Id>(),
          name: "revenue",
          dataType: "double" as const,
        },
      ];
      const result = makeColumnIdVizConfigFromNameBoundConfig({
        config: config,
        columns: columns,
      });
      expect(result.config).toMatchObject({ series: [] });
      expect(result.issues).toEqual([
        { target: "series.0.key", reason: "ambiguous" },
      ]);
      expect(config).toEqual(original);
    },
  );

  it("accepts a unique case-insensitive output name", () => {
    const result = makeColumnIdVizConfigFromNameBoundConfig({
      config: { vizType: "funnel", nameKey: "QUARTER", valueKey: "REVENUE" },
      columns: COLUMNS,
    });
    expect(result).toEqual({
      config: { vizType: "funnel", nameKey: CATEGORY_ID, valueKey: REVENUE_ID },
      issues: [],
    });
  });

  it("reports missing required targets without changing the input config", () => {
    const config = CONFIGS[4]!;
    const original = structuredClone(config);
    const result = makeColumnIdVizConfigFromNameBoundConfig({
      config: config,
      columns: COLUMNS.filter(propNotEq("id", SIZE_ID)),
    });
    expect(result.config).toMatchObject({ series: [] });
    expect(result.issues).toEqual([
      { target: "series.0.sizeKey", reason: "missing" },
    ]);
    expect(config).toEqual(original);
  });
});
