import { Flex, List, Text } from "@mantine/core";
import { UnknownDataFrame } from "$/lib/types/common";
import { isEpochMs } from "$/lib/utils/guards/isEpochMs";
import { isISODateString } from "$/lib/utils/guards/isISODateString";
import { objectValues } from "$/lib/utils/objects/objectValues/objectValues";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { flattenError, object, prettifyError, string } from "zod";
import { Callout } from "@/lib/ui/Callout";
import { DangerText } from "@/lib/ui/text/DangerText";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { LineChart } from "@/lib/ui/viz/LineChart";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { AvaDataTypes } from "@/models/datasets/AvaDataType";
import { QueryResultColumn } from "@/models/queries/QueryResult/QueryResult.types";
import { DataExplorerStateManager } from "./DataExplorerStateManager";

type Props = {
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
const BarChartConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

const LineChartConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

const ScatterPlotConfigSchema = object({
  xAxisKey: XAxisKeySchema,
  yAxisKey: YAxisKeySchema,
});

export function VisualizationContainer({ columns, data }: Props): JSX.Element {
  const { vizConfig } = DataExplorerStateManager.useState();
  // TODO(jpsyx): this should get supplied as a prop
  const dateColumns = useMemo(() => {
    return new Set(
      columns
        .filter((f) => {
          const sampleVal = data[0]?.[f.name];
          return (
            AvaDataTypes.isTemporal(f.dataType) ||
            isISODateString(sampleVal) ||
            isEpochMs(sampleVal)
          );
        })
        .map(prop("name")),
    );
  }, [columns, data]);
  const columnNames = columns.map(prop("name"));

  const viz = match(vizConfig)
    .with({ vizType: "table" }, () => {
      return (
        <DataGrid
          columnNames={columnNames}
          data={data}
          dateColumns={dateColumns}
          dateFormat="YYYY-MM-DD HH:mm:ss z"
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
        return <BarChart data={data} height={700} {...validConfig} />;
      }

      // generate the error message
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
        return <LineChart data={data} height={700} {...validConfig} />;
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
    .exhaustive();

  return (
    <Flex h="100%" w="100%" justify="center" align="center">
      {viz}
    </Flex>
  );
}
