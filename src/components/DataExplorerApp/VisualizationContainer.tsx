import { useMemo } from "react";
import { match } from "ts-pattern";
import { z } from "zod";
import { QueryResultColumn } from "@/clients/DuckDBClient/types";
import { UnknownDataFrame } from "@/lib/types/common";
import { DangerText } from "@/lib/ui/text/DangerText";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { LineChart } from "@/lib/ui/viz/LineChart";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart";
import { isEpochMs, isIsoDateString } from "@/lib/utils/formatters/formatDate";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { VizConfig } from "./VizSettingsForm/makeDefaultVizConfig";

type Props = {
  vizConfig: VizConfig;
  columns: readonly QueryResultColumn[];
  data: UnknownDataFrame;
};

// Reusable XY schema “blocks”
const xAxisKeySchema = z.string({
  error: (issue) => {
    return issue.input === undefined ?
        "X axis must be specified"
      : "X axis must be a string";
  },
});
const yAxisKeySchema = z.string({
  error: (issue) => {
    return issue.input === undefined ?
        "Y axis must be specified"
      : "Y axis must be a string";
  },
});

// Chart-specific schemas (can diverge later)
const BarChartSettingsSchema = z.object({
  xAxisKey: xAxisKeySchema,
  yAxisKey: yAxisKeySchema,
});

const LineChartSettingsSchema = z.object({
  xAxisKey: xAxisKeySchema,
  yAxisKey: yAxisKeySchema,
});

const ScatterChartSettingsSchema = z.object({
  xAxisKey: xAxisKeySchema,
  yAxisKey: yAxisKeySchema,
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
            f.dataType === "date" ||
            isIsoDateString(sampleVal) ||
            isEpochMs(sampleVal)
          );
        })
        .map((f) => {
          return f.name;
        }),
    );
  }, [columns, data]);

  return match(vizConfig)
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
      const errorMessages = z.prettifyError(error);
      return <DangerText>{errorMessages}</DangerText>;
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
      return <DangerText>{z.prettifyError(error)}</DangerText>;
    })
    .with({ type: "scatter" }, (config) => {
      const {
        success,
        data: settings,
        error,
      } = ScatterChartSettingsSchema.safeParse(config.settings);

      if (success) {
        return <ScatterChart data={data} height={700} {...settings} />;
      }
      return <DangerText>{z.prettifyError(error)}</DangerText>;
    })
    .exhaustive();
}
