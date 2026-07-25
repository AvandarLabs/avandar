import { useLingui } from "@lingui/react/macro";
import { Box, Flex, List, Text } from "@mantine/core";
import { Callout, DangerText } from "@ui";
import { objectValues, prop, UnknownDataFrame } from "@utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import {
  array,
  flattenError,
  looseObject,
  object,
  prettifyError,
  string,
} from "zod";
import { useVizDataLimit } from "@/components/VisualizationContainer/useVizDataLimit";
import css from "@/components/VisualizationContainer/VisualizationContainer.module.css";
import { AreaChart } from "@/lib/ui/viz/AreaChart";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { BubbleChart } from "@/lib/ui/viz/BubbleChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { FunnelChart } from "@/lib/ui/viz/FunnelChart";
import { LineChart } from "@/lib/ui/viz/LineChart";
import { PieChart } from "@/lib/ui/viz/PieChart";
import { RadarChart } from "@/lib/ui/viz/RadarChart";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";
import type { ReactNode } from "react";

type Props = {
  columns: readonly QueryResultColumn[];

  /**
   * The names of the query result columns that are dates.
   *
   * This is not a great way to handle date columns and we should find a
   * better way to handle this.
   */
  dateColumns: ReadonlySet<string>;
  data: UnknownDataFrame;

  /** The visualization config that drives what is rendered. */
  vizConfig: VizConfig;
};

/**
 * Builds the Zod schemas used to validate `VizConfig` shapes for each chart
 * type. Schemas are rebuilt per call so their error messages stay localized
 * to the current Lingui locale.
 */
function useVizConfigSchemas() {
  // Hook-bound `t` intentionally shadows the module-level macro `t` so this
  // React-render path stays subscribed to locale changes via `useLingui()`.

  const { t } = useLingui();
  return useMemo(() => {
    const XAxisKeySchema = string({
      error: (issue) => {
        return issue.input === undefined ?
            t`You haven't chosen an X axis`
          : t`Invalid X axis selected`;
      },
    });
    const NameKeySchema = string({
      error: (issue) => {
        return issue.input === undefined ?
            t`You haven't chosen a name column`
          : t`Invalid name column selected`;
      },
    });
    const ValueKeySchema = string({
      error: (issue) => {
        return issue.input === undefined ?
            t`You haven't chosen a value column`
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
        series: array(
          object({ key: string().min(1), xKey: string().min(1) }),
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
        series: array(
          object({
            key: string().min(1),
            xKey: string().min(1),
            sizeKey: string().min(1),
          }),
        ).min(1, { error: t`Add at least one X / Y / Size series` }),
      }),
    };
  }, [t]);
}

/**
 * Renders a visualization (chart or table) for a given query result and
 * `VizConfig`. Pure and prop-driven: holds no state of its own and has no
 * coupling to any app-specific store, so it can be reused anywhere a query
 * result needs to be visualized.
 */
export function VisualizationContainer({
  columns,
  data,
  dateColumns,
  vizConfig,
}: Props): JSX.Element {
  // Hook-bound `t` intentionally shadows the module-level macro `t` so this
  // React-render path stays subscribed to locale changes via `useLingui()`.

  const { t } = useLingui();
  const schemas = useVizConfigSchemas();
  const columnNames = columns.map(prop("name"));
  const limitedData = useVizDataLimit(vizConfig.vizType, data);

  return match(vizConfig)
    .with({ vizType: "table" }, () => {
      return (
        <Box h="100%" w="100%" mih={0}>
          <DataGrid
            columnNames={columnNames}
            data={limitedData}
            dateColumns={dateColumns}
            dateFormat="YYYY-MM-DD HH:mm:ss Z"
            height="100%"
          />
        </Box>
      );
    })
    .with({ vizType: "bar" }, (config) => {
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
      return <RenderError chartName={t`bar chart`} error={error} />;
    })
    .with({ vizType: "line" }, (config) => {
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
    })
    .with({ vizType: "area" }, (config) => {
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
    })
    .with({ vizType: "scatter" }, (config) => {
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
            />
          </Box>
        );
      }
      return <DangerText>{prettifyError(error)}</DangerText>;
    })
    .with({ vizType: "pie" }, (config) => {
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
    })
    .with({ vizType: "funnel" }, (config) => {
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
    })
    .with({ vizType: "radar" }, (config) => {
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
    })
    .with({ vizType: "bubble" }, (config) => {
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
            />
          </Box>
        );
      }
      return <DangerText>{prettifyError(error)}</DangerText>;
    })
    .otherwise((viz) => {
      return (
        <Flex h="100%" w="100%" justify="center" align="center">
          {viz}
        </Flex>
      );
    });
}

function RenderError({
  chartName,
  error,
}: {
  chartName: string;
  error: Parameters<typeof flattenError>[0];
}): ReactNode {
  // Own `useLingui()` subscription so the summary/title strings below
  // re-render on locale change, matching the hook-bound `t` used by the
  // rest of this reactive component tree.
  const { t } = useLingui();
  const errors = flattenError(error).fieldErrors as Record<
    string,
    readonly string[] | undefined
  >;
  const errorMessages = objectValues(errors).flat();
  const errorBlock = (
    <List size="xl">
      {errorMessages.map((errMsg) => {
        return (
          <List.Item key={errMsg}>
            <Text display="flex" size="xl">
              {errMsg}
            </Text>
          </List.Item>
        );
      })}
    </List>
  );

  const summaryMessage =
    errors.xAxisKey || errors.series ?
      t`The ${chartName} cannot be displayed because there are missing axes or series.`
    : t`The ${chartName} cannot be displayed.`;
  return (
    <Callout.Error
      title={t`Cannot display ${chartName}`}
      message={summaryMessage}
      w="fit-content"
      mt="-20rem"
    >
      {errorBlock}
    </Callout.Error>
  );
}
