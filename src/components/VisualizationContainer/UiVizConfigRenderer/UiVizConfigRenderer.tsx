import { DangerText } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Box } from "@mantine/core";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { array, looseObject, object, prettifyError, string } from "zod";
import css from "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.module.css";
import { useVizDataLimit } from "@/components/VisualizationContainer/useVizDataLimit/useVizDataLimit";
import { VisualizationRenderError } from "@/components/VisualizationContainer/VisualizationRenderError";
import { AreaChart } from "@/lib/ui/viz/AreaChart";
import { BarChart } from "@/lib/ui/viz/BarChart/BarChart";
import { BubbleChart } from "@/lib/ui/viz/BubbleChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { FunnelChart } from "@/lib/ui/viz/FunnelChart";
import { LineChart } from "@/lib/ui/viz/LineChart/LineChart";
import { PieChart } from "@/lib/ui/viz/PieChart";
import { RadarChart } from "@/lib/ui/viz/RadarChart/RadarChart";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart/ScatterChart";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = Readonly<{
  uiVizConfig: UiVizConfig;
  data: UnknownDataFrame;
  dateColumns: ReadonlySet<string>;
  /** Column names the table view lists, in order. */
  columnNames: readonly string[];
}>;

/**
 * Builds the Zod schemas `UiVizConfigRenderer` uses to check each chart
 * type's `UiVizConfig` before rendering it, so a missing axis, series, or
 * name column shows as an error message instead of a broken chart. The
 * schemas are rebuilt when the Lingui locale changes, so their messages stay
 * translated.
 */
function useVizConfigSchemas() {
  // Hook-bound `t` intentionally shadows the module-level macro `t` so this
  // React-render path stays subscribed to locale changes via `useLingui()`.

  const { t } = useLingui();
  return useMemo(() => {
    const XAxisKeySchema = string({
      error: (issue) => {
        return issue.input === undefined
          ? t`You haven't chosen an X axis`
          : t`Invalid X axis selected`;
      },
    });
    const NameKeySchema = string({
      error: (issue) => {
        return issue.input === undefined
          ? t`You haven't chosen a name column`
          : t`Invalid name column selected`;
      },
    });
    const ValueKeySchema = string({
      error: (issue) => {
        return issue.input === undefined
          ? t`You haven't chosen a value column`
          : t`Invalid value column selected`;
      },
    });
    const SeriesArraySchema = array(looseObject({ key: string() })).min(1, {
      error: t`You haven't added any series`,
    });

    return {
      XYSeriesConfigSchema: object({
        xAxisKey: XAxisKeySchema,
        series: SeriesArraySchema,
      }),
      ScatterPlotConfigSchema: object({
        // `looseObject` (not `object`) so per-series `label` / `color` survive
        // the parse. `object` strips unknown keys, dropping them before the
        // renderer sees them. Matches SeriesArraySchema used by XY / radar.
        series: array(
          looseObject({ key: string().min(1), xKey: string().min(1) }),
        ).min(1, { error: t`Add at least one X / Y series` }),
      }),
      PieChartConfigSchema: object({
        nameKey: NameKeySchema,
        valueKey: ValueKeySchema,
      }),
      FunnelChartConfigSchema: object({
        nameKey: NameKeySchema,
        valueKey: ValueKeySchema,
      }),
      RadarChartConfigSchema: object({
        nameKey: NameKeySchema,
        series: SeriesArraySchema,
      }),
      BubbleChartConfigSchema: object({
        // `looseObject` so per-series `label` / `color` survive the parse; see
        // ScatterPlotConfigSchema above.
        series: array(
          looseObject({
            key: string().min(1),
            xKey: string().min(1),
            sizeKey: string().min(1),
          }),
        ).min(1, { error: t`Add at least one X / Y / Size series` }),
      }),
    };
  }, [t]);
}

/** What each chart branch reads: its own config plus the shared inputs. */
type ChartRenderOptions<VType extends UiVizConfig["vizType"]> = Readonly<{
  config: Extract<UiVizConfig, { vizType: VType }>;
  schemas: ReturnType<typeof useVizConfigSchemas>;
  limitedData: UnknownDataFrame;
  dateColumns: ReadonlySet<string>;
}>;

function _renderDataGrid(
  options: Readonly<{
    columnNames: readonly string[];
    limitedData: UnknownDataFrame;
    dateColumns: ReadonlySet<string>;
  }>,
): JSX.Element {
  return (
    <Box h="100%" w="100%" mih={0}>
      <DataGrid
        columnNames={options.columnNames}
        data={options.limitedData}
        dateColumns={options.dateColumns}
        dateFormat="YYYY-MM-DD HH:mm:ss Z"
        height="100%"
      />
    </Box>
  );
}

function _renderBarChart(
  options: ChartRenderOptions<"bar"> & Readonly<{ chartName: string }>,
): JSX.Element {
  const { config, schemas, limitedData, dateColumns, chartName } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.XYSeriesConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <BarChart
          data={limitedData}
          height="100%"
          dateColumns={dateColumns}
          xAxisKey={validConfig.xAxisKey}
          series={config.series}
          layout={config.layout}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <VisualizationRenderError chartName={chartName} error={error} />;
}

function _renderLineChart(options: ChartRenderOptions<"line">): JSX.Element {
  const { config, schemas, limitedData, dateColumns } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.XYSeriesConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <LineChart
          data={limitedData}
          height="100%"
          dateColumns={dateColumns}
          xAxisKey={validConfig.xAxisKey}
          series={config.series}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderAreaChart(options: ChartRenderOptions<"area">): JSX.Element {
  const { config, schemas, limitedData, dateColumns } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.XYSeriesConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <AreaChart
          data={limitedData}
          height="100%"
          dateColumns={dateColumns}
          xAxisKey={validConfig.xAxisKey}
          series={config.series}
          layout={config.layout}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderScatterChart(
  options: ChartRenderOptions<"scatter">,
): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.ScatterPlotConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <ScatterChart
          data={limitedData}
          height="100%"
          series={validConfig.series}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderPieChart(options: ChartRenderOptions<"pie">): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.PieChartConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <PieChart
          data={limitedData}
          nameKey={validConfig.nameKey}
          valueKey={validConfig.valueKey}
          isDonut={config.isDonut}
          withLabels={config.withLabels}
          labelsType={config.labelsType}
          seriesColors={config.seriesColors}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderFunnelChart(
  options: ChartRenderOptions<"funnel">,
): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.FunnelChartConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <FunnelChart
          data={limitedData}
          nameKey={validConfig.nameKey}
          valueKey={validConfig.valueKey}
          seriesColors={config.seriesColors}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderRadarChart(options: ChartRenderOptions<"radar">): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.RadarChartConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <RadarChart
          data={limitedData}
          nameKey={validConfig.nameKey}
          series={config.series}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderBubbleChart(
  options: ChartRenderOptions<"bubble">,
): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.BubbleChartConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <BubbleChart
          data={limitedData}
          height="100%"
          series={validConfig.series}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

/**
 * Draws a chart or table from a `UiVizConfig`, a config whose columns are
 * already `QueryResult` column names. It caps the rows at the chart type's
 * render limit and checks the config's required slots before drawing, so a
 * missing axis or series shows as an error message.
 *
 * Use it wherever the column names are known without column IDs, for
 * example a chart built from rows a plugin transform produced.
 */
export function UiVizConfigRenderer({
  uiVizConfig,
  data,
  dateColumns,
  columnNames,
}: Props): JSX.Element {
  // Hook-bound `t` intentionally shadows the module-level macro `t` so this
  // React-render path stays subscribed to locale changes via `useLingui()`.

  const { t } = useLingui();
  const schemas = useVizConfigSchemas();
  const limitedData = useVizDataLimit(uiVizConfig.vizType, data);
  const shared = { schemas, limitedData, dateColumns };
  return match(uiVizConfig)
    .with({ vizType: "table" }, () => {
      return _renderDataGrid({ columnNames, limitedData, dateColumns });
    })
    .with({ vizType: "bar" }, (config) => {
      return _renderBarChart({ ...shared, config, chartName: t`bar chart` });
    })
    .with({ vizType: "line" }, (config) => {
      return _renderLineChart({ ...shared, config });
    })
    .with({ vizType: "area" }, (config) => {
      return _renderAreaChart({ ...shared, config });
    })
    .with({ vizType: "scatter" }, (config) => {
      return _renderScatterChart({ ...shared, config });
    })
    .with({ vizType: "pie" }, (config) => {
      return _renderPieChart({ ...shared, config });
    })
    .with({ vizType: "funnel" }, (config) => {
      return _renderFunnelChart({ ...shared, config });
    })
    .with({ vizType: "radar" }, (config) => {
      return _renderRadarChart({ ...shared, config });
    })
    .with({ vizType: "bubble" }, (config) => {
      return _renderBubbleChart({ ...shared, config });
    })
    .exhaustive();
}
