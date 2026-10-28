import { propNotEq } from "@avandar/utils";
import { P, match } from "ts-pattern";
import { describe, expect, it } from "vitest";
/** Renderer reads follow saved IDs even when output names change. */
import { uuid } from "$/lib/uuid.ts";
import { makeNameBoundVizConfigFromColumnIdConfig } from "$/models/vizs/makeNameBoundVizConfigFromColumnIdConfig/makeNameBoundVizConfigFromColumnIdConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { ColumnIdVizConfig } from "$/models/vizs/ColumnIdVizConfig/ColumnIdVizConfig.ts";

const REVENUE_ID = uuid<QueryColumn.Id>();
const CATEGORY_ID = uuid<QueryColumn.Id>();
const SIZE_ID = uuid<QueryColumn.Id>();
const COLUMNS: QueryResult.ColumnWithId[] = [
  { id: REVENUE_ID, name: "amount", dataType: "double" },
  { id: CATEGORY_ID, name: "period", dataType: "varchar" },
  { id: SIZE_ID, name: "radius", dataType: "double" },
  { id: uuid<QueryColumn.Id>(), name: "revenue", dataType: "double" },
];
const ROW: Record<string, string | number> = {
  amount: 7,
  revenue: 999,
  period: "Q1",
  radius: 3,
};
const SERIES: { key: QueryColumn.Id; label: string; color: string } = {
  key: REVENUE_ID,
  label: "Revenue trend",
  color: "#123456",
};
const CHART_STYLE: NonNullable<
  Extract<ColumnIdVizConfig.T, { vizType: "bar" }>["chartStyle"]
> = { xAxis: { label: "revenue", tickColor: "blue.6" } };

function _readValues({
  config,
  row = ROW,
}: {
  config: ColumnIdVizConfig.NameBound;
  row?: Readonly<Record<string, string | number>>;
}): unknown[] {
  return match(config)
    .with({ vizType: "table" }, () => {
      return Object.values(row);
    })
    .with({ vizType: P.union("bar", "line", "area") }, (chart) => {
      return [
        row[chart.xAxisKey!],
        ...chart.series.map((series) => {
          return row[series.key];
        }),
      ];
    })
    .with({ vizType: "scatter" }, (chart) => {
      return chart.series.flatMap((series) => {
        return [row[series.xKey], row[series.key]];
      });
    })
    .with({ vizType: "bubble" }, (chart) => {
      return chart.series.flatMap((series) => {
        return [row[series.xKey], row[series.key], row[series.sizeKey]];
      });
    })
    .with({ vizType: "radar" }, (chart) => {
      return [
        row[chart.nameKey!],
        ...chart.series.map((series) => {
          return row[series.key];
        }),
      ];
    })
    .with({ vizType: P.union("pie", "funnel") }, (chart) => {
      return [row[chart.nameKey!], row[chart.valueKey!]];
    })
    .exhaustive();
}

const CONFIGS: ColumnIdVizConfig.T[] = [
  {
    vizType: "bar",
    xAxisKey: CATEGORY_ID,
    series: [{ ...SERIES, renderAs: "line", curveType: "step" }],
    layout: "stack",
    withLegend: true,
    chartStyle: CHART_STYLE,
  },
  {
    vizType: "line",
    xAxisKey: CATEGORY_ID,
    series: [{ ...SERIES, renderAs: "area", fillOpacity: 0.4 }],
    withLegend: false,
    chartStyle: CHART_STYLE,
  },
  {
    vizType: "area",
    xAxisKey: CATEGORY_ID,
    series: [{ ...SERIES, renderAs: "bar", stackId: "revenue" }],
    layout: "split",
    withLegend: true,
    chartStyle: CHART_STYLE,
  },
  {
    vizType: "scatter",
    series: [{ ...SERIES, xKey: CATEGORY_ID }],
    chartStyle: CHART_STYLE,
  },
  {
    vizType: "bubble",
    series: [{ ...SERIES, xKey: CATEGORY_ID, sizeKey: SIZE_ID }],
    chartStyle: CHART_STYLE,
  },
  {
    vizType: "radar",
    nameKey: CATEGORY_ID,
    series: [{ ...SERIES, strokeWidth: 4, fillOpacity: 0.3 }],
    withLegend: false,
    chartStyle: CHART_STYLE,
  },
  {
    vizType: "pie",
    nameKey: CATEGORY_ID,
    valueKey: REVENUE_ID,
    isDonut: true,
    withLabels: true,
    labelsType: "percent",
    seriesColors: { revenue: "#123456" },
  },
  {
    vizType: "funnel",
    nameKey: CATEGORY_ID,
    valueKey: REVENUE_ID,
    seriesColors: { revenue: "#123456" },
  },
  { vizType: "table" },
];

describe("makeNameBoundVizConfigFromColumnIdConfig", () => {
  it.each(CONFIGS)(
    "reads renamed outputs for $vizType while preserving presentation",
    (config) => {
      const original = structuredClone(config);
      const resolved = makeNameBoundVizConfigFromColumnIdConfig({
        config: config,
        columns: COLUMNS,
      });
      const expectedValues =
        config.vizType === "table"
          ? Object.values(ROW)
          : config.vizType === "bubble"
            ? ["Q1", 7, 3]
            : ["Q1", 7];
      expect(_readValues({ config: resolved.config })).toEqual(expectedValues);
      expect(resolved.issues).toEqual([]);
      expect(config).toEqual(original);
      if ("chartStyle" in config) {
        expect(resolved.config).toMatchObject({ chartStyle: CHART_STYLE });
      }
      if ("seriesColors" in config) {
        expect(resolved.config).toMatchObject({
          seriesColors: { revenue: "#123456" },
        });
      }
    },
  );

  it("reads the saved XY measure after revenue is renamed to amount", () => {
    const resolved = makeNameBoundVizConfigFromColumnIdConfig({
      config: CONFIGS[0]!,
      columns: COLUMNS,
    });
    if (resolved.config.vizType !== "bar") {
      throw new Error("Expected bar configuration");
    }
    expect(resolved.config.series).toEqual([
      { ...SERIES, key: "amount", renderAs: "line", curveType: "step" },
    ]);
    const row = { amount: 7, revenue: 999 };
    expect(row[resolved.config.series[0]!.key as keyof typeof row]).toBe(7);
  });

  it.each([
    { vizType: "scatter", slot: "xKey" },
    { vizType: "scatter", slot: "key" },
    { vizType: "bubble", slot: "xKey" },
    { vizType: "bubble", slot: "key" },
    { vizType: "bubble", slot: "sizeKey" },
  ] as const)(
    "moves $vizType $slot independently of the other coordinates",
    ({ vizType, slot }) => {
      const config: ColumnIdVizConfig.T =
        vizType === "scatter"
          ? { vizType, series: [{ key: REVENUE_ID, xKey: CATEGORY_ID }] }
          : {
              vizType,
              series: [
                { key: REVENUE_ID, xKey: CATEGORY_ID, sizeKey: SIZE_ID },
              ],
            };
      const movedId =
        slot === "sizeKey"
          ? SIZE_ID
          : slot === "xKey"
            ? CATEGORY_ID
            : REVENUE_ID;
      const columns = COLUMNS.map((column) => {
        return {
          ...column,
          name: column.id === movedId ? "moved" : column.name,
        };
      });
      const resolved = makeNameBoundVizConfigFromColumnIdConfig({
        config: config,
        columns: columns,
      });
      expect(resolved.config).toMatchObject({ series: [{ [slot]: "moved" }] });
      expect(resolved.issues).toEqual([]);
      const expectedValues = vizType === "bubble" ? ["Q1", 7, 3] : ["Q1", 7];
      const movedIndex = slot === "xKey" ? 0 : slot === "key" ? 1 : 2;
      expect(
        _readValues({ config: resolved.config, row: { ...ROW, moved: 42 } }),
      ).toEqual(
        expectedValues.map((value, index) => {
          return index === movedIndex ? 42 : value;
        }),
      );
    },
  );

  it.each(
    CONFIGS.filter((config) => {
      return "series" in config;
    }),
  )("omits unusable $vizType series only in output", (config) => {
    const original = structuredClone(config);
    const result = makeNameBoundVizConfigFromColumnIdConfig({
      config: config,
      columns: COLUMNS.filter(propNotEq("id", REVENUE_ID)),
    });
    expect(result.config).toMatchObject({ series: [] });
    expect(result.issues).toContainEqual({
      target: "series.0.key",
      reason: "missing",
    });
    expect(config).toEqual(original);
  });

  it.each(["xKey", "sizeKey"] as const)(
    "omits a bubble with missing $slot instead of using a name match",
    (slot) => {
      const missingId = slot === "xKey" ? CATEGORY_ID : SIZE_ID;
      const columns = COLUMNS.filter(propNotEq("id", missingId));
      columns.push({
        id: uuid<QueryColumn.Id>(),
        name: missingId,
        dataType: "double",
      });
      const result = makeNameBoundVizConfigFromColumnIdConfig({
        config: CONFIGS[4]!,
        columns: columns,
      });
      expect(result.config).toMatchObject({ series: [] });
      expect(result.issues).toEqual([
        { target: `series.0.${slot}`, reason: "missing" },
      ]);
    },
  );

  it.each(
    CONFIGS.filter((config) => {
      return "xAxisKey" in config || "nameKey" in config;
    }),
  )(
    "clears missing $vizType category bindings without a replacement",
    (config) => {
      const result = makeNameBoundVizConfigFromColumnIdConfig({
        config: config,
        columns: COLUMNS.filter(propNotEq("id", CATEGORY_ID)),
      });
      expect(result.config).toHaveProperty(
        "xAxisKey" in config ? "xAxisKey" : "nameKey",
        undefined,
      );
      expect(result.issues).toHaveLength(1);
    },
  );
});
