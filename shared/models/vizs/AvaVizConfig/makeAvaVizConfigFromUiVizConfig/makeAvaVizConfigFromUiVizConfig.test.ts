import { propNotEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";
/** Chart `QueryResult` column names bind uniquely before rendering. */
import { uuid } from "$/lib/uuid.ts";
import { makeAvaVizConfigFromUiVizConfig } from "$/models/vizs/AvaVizConfig/makeAvaVizConfigFromUiVizConfig/makeAvaVizConfigFromUiVizConfig.ts";
import { makeUiVizConfigFromAvaVizConfig } from "$/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types.ts";

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
const CONFIGS: UiVizConfig[] = [
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
  {
    vizType: "plugin",
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    columnSettings: { date: "quarter", count: "revenue" },
    settings: { interval: "epiWeek" },
  },
];

describe("makeAvaVizConfigFromUiVizConfig", () => {
  it.each(CONFIGS)(
    "binds $vizType without changing its style or category values",
    (config) => {
      const result = makeAvaVizConfigFromUiVizConfig({
        config: config,
        columns: COLUMNS,
      });
      expect(result.issues).toEqual([]);
      expect(
        makeUiVizConfigFromAvaVizConfig({
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
    "rejects ambiguous QueryResult column name %s without choosing the first column",
    (key) => {
      const config: UiVizConfig = {
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
      const result = makeAvaVizConfigFromUiVizConfig({
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

  it("binds a plugin chart's column settings to column IDs", () => {
    const result = makeAvaVizConfigFromUiVizConfig({
      config: CONFIGS[9]!,
      columns: COLUMNS,
    });
    expect(result.config).toMatchObject({
      columnSettings: { date: CATEGORY_ID, count: REVENUE_ID },
    });
  });

  it.each([undefined, null])(
    "leaves a plugin config whose column settings are %s as it is",
    (columnSettings) => {
      const config = {
        ...CONFIGS[9]!,
        columnSettings,
      } as unknown as UiVizConfig;
      expect(
        makeAvaVizConfigFromUiVizConfig({ config, columns: COLUMNS }),
      ).toEqual({ config, issues: [] });
    },
  );

  it("leaves an ambiguous plugin column setting unset and reports it", () => {
    const result = makeAvaVizConfigFromUiVizConfig({
      config: {
        vizType: "plugin",
        pluginId: "avandar.epidemiology",
        pluginVizId: "epicurve",
        columnSettings: { count: "revenue" },
        settings: {},
      },
      columns: [
        ...COLUMNS,
        {
          id: uuid<QueryColumn.Id>(),
          name: "revenue",
          dataType: "double" as const,
        },
      ],
    });
    expect(result).toEqual({
      config: {
        vizType: "plugin",
        pluginId: "avandar.epidemiology",
        pluginVizId: "epicurve",
        columnSettings: { count: undefined },
        settings: {},
      },
      issues: [{ target: "columnSettings.count", reason: "ambiguous" }],
    });
  });

  it("accepts a unique case-insensitive QueryResult column name", () => {
    const result = makeAvaVizConfigFromUiVizConfig({
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
    const result = makeAvaVizConfigFromUiVizConfig({
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
