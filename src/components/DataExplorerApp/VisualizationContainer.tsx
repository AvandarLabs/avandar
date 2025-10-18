import { Flex, List, Text } from "@mantine/core";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { flattenError, object, prettifyError, string } from "zod";
import { QueryResultColumn } from "@/clients/DuckDBClient/types";
import { Logger } from "@/lib/Logger";
import { UnknownDataFrame } from "@/lib/types/common";
import { Callout } from "@/lib/ui/Callout";
import { DangerText } from "@/lib/ui/text/DangerText";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { LineChart } from "@/lib/ui/viz/LineChart";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart";
import { isEpochMs, isIsoDateString } from "@/lib/utils/formatters/formatDate";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectValues } from "@/lib/utils/objects/misc";
import { AvaDataTypeUtils } from "@/models/datasets/AvaDataType";
import { VizConfig } from "./VizSettingsForm/makeDefaultVizConfig";

type Props = {
  vizConfig: VizConfig;
  columns: readonly QueryResultColumn[];
  data: UnknownDataFrame;
};

// Reusable XY schema “blocks”
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

// Chart-specific schemas (can diverge later)
const BarChartSettingsSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

const LineChartSettingsSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

const ScatterPlotSettingsSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

export function VisualizationContainer({
  vizConfig,
  columns,
  data,
}: Props): JSX.Element {
  const fieldNames = useMemo(() => {
    return columns.map(getProp("name"));
  }, [columns]);

  // TODO(jpsyx): this should get supplied as a prop
  const dateColumns = useMemo(() => {
    return new Set(
      columns
        .filter((f) => {
          const sampleVal = data[0]?.[f.name];
          return (
            AvaDataTypeUtils.isTemporal(f.dataType) ||
            isIsoDateString(sampleVal) ||
            isEpochMs(sampleVal)
          );
        })
        .map(getProp("name")),
    );
  }, [columns, data]);

  const viz = match(vizConfig)
    .with({ type: "table" }, () => {
      return (
        <DataGrid
          columnNames={fieldNames}
          data={data}
          dateColumns={dateColumns}
          dateFormat="YYYY-MM-DD HH:mm:ss z"
          height="100%"
        />
      );
    })
    .with({ type: "bar" }, (config) => {
      const {
        success,
        data: settings,
        error,
      } = BarChartSettingsSchema.safeParse(config.settings);
      if (success) {
        return <BarChart data={data} height={700} {...settings} />;
      }

      // generate the error message
      const errors = flattenError(error).fieldErrors;
      Logger.log("errors", errors);
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
    .with({ type: "line" }, (config) => {
      const {
        success,
        data: settings,
        error,
      } = LineChartSettingsSchema.safeParse(config.settings);

      if (success) {
        return <LineChart data={data} height={700} {...settings} />;
      }
      return <DangerText>{prettifyError(error)}</DangerText>;
    })
    .with({ type: "scatter" }, (config) => {
      const {
        success,
        data: settings,
        error,
      } = ScatterPlotSettingsSchema.safeParse(config.settings);

      if (success) {
        return <ScatterChart data={data} height={700} {...settings} />;
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
