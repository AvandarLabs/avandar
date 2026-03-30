import { Box, Flex, List, Text } from "@mantine/core";
import { prop } from "@utils/objects/hofs/prop/prop";
import { objectValues } from "@utils/objects/objectValues";
import { UnknownDataFrame } from "@utils/types/common.types";
import { match } from "ts-pattern";
import { flattenError, object, prettifyError, string } from "zod";
import { Callout } from "@/lib/ui/Callout";
import { AreaChart } from "@/lib/ui/viz/AreaChart";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { BubbleChart } from "@/lib/ui/viz/BubbleChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { FunnelChart } from "@/lib/ui/viz/FunnelChart";
import { LineChart } from "@/lib/ui/viz/LineChart";
import { PieChart } from "@/lib/ui/viz/PieChart";
import { RadarChart } from "@/lib/ui/viz/RadarChart";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { DangerText } from "@/lib/ui/text/DangerText";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";

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
};

// Reusable XY schema "blocks"
const XAxisKeySchema = string({
  error: (issue) => {
    return issue.input === undefined ?
        "You haven't chosen an X axis"
      : "Invalid X axis selected";
  },
});
const YAxisKeySchema = string({
  error: (issue) => {
    return issue.input === undefined ?
        "You haven't chosen a Y axis"
      : "Invalid Y axis selected";
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

const BarChartConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

const LineChartConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

const AreaChartConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

const ScatterPlotConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
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
  valueKey: ValueKeySchema,
});

const BubbleChartConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
  sizeKey: SizeKeySchema,
});

export function VisualizationContainer({
  columns,
  data,
  dateColumns,
}: Props): JSX.Element {
  const { vizConfig } = DataExplorerStateManager.useState();
  const columnNames = columns.map(prop("name"));

  const viz = match(vizConfig)
    .with({ vizType: "table" }, () => {
      return (
        <DataGrid
          columnNames={columnNames}
          data={data}
          dateColumns={dateColumns}
          dateFormat="YYYY-MM-DD HH:mm:ss Z"
          height="100%"
        />
      );
    })
    .with({ vizType: "bar" }, (config) => {
      const {
        success,
        data: validConfig,
        error,
      } = BarChartConfigSchema.safeParse(config);
      if (success) {
        return (
          <Box w="100%">
            <BarChart
              data={data}
              height={700}
              dateColumns={dateColumns}
              withLegend={config.withLegend}
              color={config.color}
              {...validConfig}
            />
          </Box>
        );
      }

      const errors = flattenError(error).fieldErrors;
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
        errors.xAxisKey || errors.yAxisKey ?
          "The bar chart cannot be displayed because there are missing axes."
        : "The bar chart cannot be displayed.";
      return (
        <Callout.Error
          title="Cannot display bar chart"
          message={summaryMessage}
          w="fit-content"
          mt="-20rem"
        >
          {errorBlock}
        </Callout.Error>
      );
    })
    .with({ vizType: "line" }, (config) => {
      const {
        success,
        data: validConfig,
        error,
      } = LineChartConfigSchema.safeParse(config);

      if (success) {
        return (
          <Box w="100%">
            <LineChart
              data={data}
              height={700}
              dateColumns={dateColumns}
              withLegend={config.withLegend}
              curveType={config.curveType}
              color={config.color}
              {...validConfig}
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
      } = AreaChartConfigSchema.safeParse(config);

      if (success) {
        return (
          <Box w="100%">
            <AreaChart
              data={data}
              height={700}
              dateColumns={dateColumns}
              withLegend={config.withLegend}
              curveType={config.curveType}
              color={config.color}
              {...validConfig}
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
        return <ScatterChart data={data} height={700} {...validConfig} />;
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
          <PieChart
            data={data}
            nameKey={validConfig.nameKey}
            valueKey={validConfig.valueKey}
            isDonut={config.isDonut}
            withLabels={config.withLabels}
            labelsType={config.labelsType}
            seriesColors={config.seriesColors}
          />
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
          <FunnelChart
            data={data}
            nameKey={validConfig.nameKey}
            valueKey={validConfig.valueKey}
            seriesColors={config.seriesColors}
          />
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
          <RadarChart
            data={data}
            nameKey={validConfig.nameKey}
            valueKey={validConfig.valueKey}
            color={config.color}
          />
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
          <BubbleChart
            data={data}
            height={700}
            xAxisKey={validConfig.xAxisKey}
            yAxisKey={validConfig.yAxisKey}
            sizeKey={validConfig.sizeKey}
          />
        );
      }
      return <DangerText>{prettifyError(error)}</DangerText>;
    })
    .exhaustive();

  return (
    <Flex h="100%" w="100%" justify="center" align="center">
      {viz}
    </Flex>
  );
}
