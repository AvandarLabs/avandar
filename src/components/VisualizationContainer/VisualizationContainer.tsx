import { Box, Flex, List, Text } from "@mantine/core";
import { Callout, DangerText } from "@ui";
import { objectValues, prop, UnknownDataFrame } from "@utils";
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

const XAxisKeySchema = string({
  error: (issue) => {
    return issue.input === undefined ?
        "You haven't chosen an X axis"
      : "Invalid X axis selected";
  },
});
const NameKeySchema = string({
  error: (issue) => {
    return issue.input === undefined ?
        "You haven't chosen a name column"
      : "Invalid name column selected";
  },
});
const ValueKeySchema = string({
  error: (issue) => {
    return issue.input === undefined ?
        "You haven't chosen a value column"
      : "Invalid value column selected";
  },
});
const SizeKeySchema = string({
  error: (issue) => {
    return issue.input === undefined ?
        "You haven't chosen a size column"
      : "Invalid size column selected";
  },
});
const SeriesArraySchema = array(looseObject({ key: string() })).min(1, {
  error: "You haven't added any series",
});

const XYSeriesConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  series: SeriesArraySchema,
});

const ScatterPlotConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: string({
    error: (issue) => {
      return issue.input === undefined ?
          "You haven't chosen a Y axis"
        : "Invalid Y axis selected";
    },
  }),
});

const PieChartConfigSchema = object({
  nameKey: NameKeySchema,
  valueKey: ValueKeySchema,
});

const FunnelChartConfigSchema = object({
  nameKey: NameKeySchema,
  valueKey: ValueKeySchema,
});

const RadarChartConfigSchema = object({
  nameKey: NameKeySchema,
  series: SeriesArraySchema,
});

const BubbleChartConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: string({
    error: (issue) => {
      return issue.input === undefined ?
          "You haven't chosen a Y axis"
        : "Invalid Y axis selected";
    },
  }),
  sizeKey: SizeKeySchema,
});

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
      } = XYSeriesConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%" h="100%" style={{ overflow: "hidden" }}>
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
      return _renderError("bar chart", error);
    })
    .with({ vizType: "line" }, (config) => {
      const {
        success,
        data: validConfig,
        error,
      } = XYSeriesConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%" h="100%" style={{ overflow: "hidden" }}>
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
      } = XYSeriesConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%" h="100%" style={{ overflow: "hidden" }}>
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
      } = ScatterPlotConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%" h="100%" style={{ overflow: "hidden" }}>
            <ScatterChart data={limitedData} height="100%" {...validConfig} />
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
      } = PieChartConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%" h="100%" style={{ overflow: "hidden" }}>
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
      } = FunnelChartConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%" h="100%" style={{ overflow: "hidden" }}>
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
      } = RadarChartConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%" h="100%" style={{ overflow: "hidden" }}>
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
      } = BubbleChartConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%" h="100%" style={{ overflow: "hidden" }}>
            <BubbleChart
              data={limitedData}
              height="100%"
              xAxisKey={validConfig.xAxisKey}
              yAxisKey={validConfig.yAxisKey}
              sizeKey={validConfig.sizeKey}
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

function _renderError(
  chartName: string,
  error: Parameters<typeof flattenError>[0],
): JSX.Element {
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
      `The ${chartName} cannot be displayed because there are missing axes or series.`
    : `The ${chartName} cannot be displayed.`;
  return (
    <Callout.Error
      title={`Cannot display ${chartName}`}
      message={summaryMessage}
      w="fit-content"
      mt="-20rem"
    >
      {errorBlock}
    </Callout.Error>
  );
}
