import { describe, expect, it } from "vitest";
import { makeUiVizConfigFromAvaVizConfig } from "$/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig";
import { useCategorySplitChartInput } from "@/components/VisualizationContainer/useCategorySplitChartInput/useCategorySplitChartInput";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import { TestProviders, renderHook } from "@/test-utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { ChartInput } from "@/components/VisualizationContainer/useCategorySplitChartInput/useCategorySplitChartInput";
import type { UnknownDataFrame } from "@avandar/utils";

const WEEK_ID = "week-id" as QueryColumn.Id;
const DISTRICT_ID = "district-id" as QueryColumn.Id;
const CASES_ID = "cases-id" as QueryColumn.Id;
const DEATHS_ID = "deaths-id" as QueryColumn.Id;

const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: WEEK_ID, name: "week", dataType: "date" },
  { id: DISTRICT_ID, name: "district", dataType: "varchar" },
  { id: CASES_ID, name: "cases", dataType: "bigint" },
  { id: DEATHS_ID, name: "deaths", dataType: "bigint" },
];

const DATE_COLUMNS: ReadonlySet<string> = new Set(["week"]);

const TWO_DISTRICT_ROWS: UnknownDataFrame = [
  { week: "2024-01-01", district: "North", cases: 5, deaths: 1 },
  { week: "2024-01-01", district: "South", cases: 3, deaths: 0 },
];

const LINE_CONFIG: AvaVizConfig.T = {
  vizType: "line",
  xAxisKey: WEEK_ID,
  series: [{ renderAs: "line", key: CASES_ID }],
  withLegend: false,
};

/** Rows for ten districts in one week, A largest, so two join Other. */
function _makeTenDistrictRows(names: readonly string[]): UnknownDataFrame {
  return names.map((district, index) => {
    return { week: "2024-01-01", district, cases: 100 - index, deaths: 0 };
  });
}

function _renderSplit(input: ChartInput) {
  return renderHook(
    (props: ChartInput) => {
      return useCategorySplitChartInput(props);
    },
    { initialProps: input, wrapper: TestProviders },
  );
}

function _makeInput(
  vizConfig: AvaVizConfig.T,
  data: UnknownDataFrame = TWO_DISTRICT_ROWS,
): ChartInput {
  return { columns: COLUMNS, data, dateColumns: DATE_COLUMNS, vizConfig };
}

function _getSeriesColors(vizConfig: AvaVizConfig.T): unknown[] {
  return "series" in vizConfig
    ? vizConfig.series.map((series) => {
        return "color" in series ? series.color : undefined;
      })
    : [];
}

describe("useCategorySplitChartInput", () => {
  it("colors the Other bucket neutral and each district from the palette", () => {
    const rows = _makeTenDistrictRows([..."ABCDEFGHIJ"]);

    const { result } = _renderSplit(_makeInput(LINE_CONFIG, rows));

    const colors = _getSeriesColors(result.current.vizConfig);
    expect(colors).toEqual([
      ...CHART_COLOR_SWATCHES.slice(0, 8),
      "var(--mantine-color-neutral-5)",
    ]);
  });

  it("colors a real district named Other from the palette", () => {
    const rows: UnknownDataFrame = [
      { week: "2024-01-01", district: "North", cases: 5, deaths: 0 },
      { week: "2024-01-01", district: "Other", cases: 3, deaths: 0 },
    ];

    const { result } = _renderSplit(_makeInput(LINE_CONFIG, rows));

    expect(_getSeriesColors(result.current.vizConfig)).toEqual(
      CHART_COLOR_SWATCHES.slice(0, 2),
    );
  });

  it("names the column the chart is split by", () => {
    const { result } = _renderSplit(_makeInput(LINE_CONFIG));

    expect(result.current.splitColumnName).toBe("district");
  });

  it("passes a pie chart through unchanged", () => {
    const input = _makeInput({
      vizType: "pie",
      nameKey: DISTRICT_ID,
      valueKey: CASES_ID,
      isDonut: false,
      withLabels: true,
      labelsType: "value",
    });

    const { result } = _renderSplit(input);

    expect(result.current).toEqual({ ...input, splitColumnName: undefined });
    expect(result.current.data).toBe(input.data);
  });

  it("passes a chart with two series through unchanged", () => {
    const input = _makeInput({
      ...LINE_CONFIG,
      series: [
        { renderAs: "line", key: CASES_ID },
        { renderAs: "line", key: DEATHS_ID },
      ],
    });

    const { result } = _renderSplit(input);

    expect(result.current.vizConfig).toBe(input.vizConfig);
    expect(result.current.splitColumnName).toBeUndefined();
  });

  it("returns the same result when re-rendered with the same input", () => {
    const input = _makeInput(LINE_CONFIG);
    const { result, rerender } = _renderSplit(input);
    const firstResult = result.current;

    rerender({ ...input });

    expect(result.current).toBe(firstResult);
  });

  it("splits a bar chart into bar series and keeps its layout", () => {
    const { result } = _renderSplit(
      _makeInput({
        vizType: "bar",
        layout: "group",
        xAxisKey: WEEK_ID,
        series: [{ renderAs: "bar", key: CASES_ID }],
        withLegend: false,
      }),
    );

    const { columns, vizConfig } = result.current;
    expect(
      makeUiVizConfigFromAvaVizConfig({ config: vizConfig, columns }).config,
    ).toMatchObject({
      layout: "group",
      withLegend: true,
      series: [
        { renderAs: "bar", key: "North" },
        { renderAs: "bar", key: "South" },
      ],
    });
  });

  it("splits an area chart into area series and keeps its layout", () => {
    const { result } = _renderSplit(
      _makeInput({
        vizType: "area",
        layout: "default",
        xAxisKey: WEEK_ID,
        series: [{ renderAs: "area", key: CASES_ID }],
        withLegend: false,
      }),
    );

    const { columns, vizConfig } = result.current;
    expect(
      makeUiVizConfigFromAvaVizConfig({ config: vizConfig, columns }).config,
    ).toMatchObject({
      layout: "default",
      withLegend: true,
      series: [
        { renderAs: "area", key: "North" },
        { renderAs: "area", key: "South" },
      ],
    });
  });
});
