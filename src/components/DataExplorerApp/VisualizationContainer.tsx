import { useMemo } from "react";
import { match } from "ts-pattern";
import { z } from "zod";
import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { UnknownDataFrame } from "@/lib/types/common";
import { BarChart } from "@/lib/ui/data-viz/BarChart";
import { DataGrid } from "@/lib/ui/data-viz/DataGrid";
import { LineChart } from "@/lib/ui/data-viz/LineChart";
import {
  CHART_REQUIREMENTS,
  classifyFieldsByKind,
} from "@/lib/ui/data-viz/requirements/chartRequirements";
import { EmptyState } from "@/lib/ui/EmptyState";
import { isEpochMs, isIsoDateString } from "@/lib/utils/formatters/formatDate";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { VizConfig } from "./VizSettingsForm/makeDefaultVizConfig";

type Props = {
  vizConfig: VizConfig;
  fields: readonly QueryResultField[];
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

export function VisualizationContainer({
  vizConfig,
  fields,
  data,
}: Props): JSX.Element {
  const fieldNames = useMemo(() => {
    return fields.map(getProp("name"));
  }, [fields]);

  const dateColumns = useMemo(() => {
    return new Set(
      fields
        .filter((field) => {
          const sampleVal = data[0]?.[field.name];
          return (
            field.dataType === "date" ||
            isIsoDateString(sampleVal) ||
            isEpochMs(sampleVal)
          );
        })
        .map((field) => {
          return field.name;
        }),
    );
  }, [fields, data]);

  const fieldsByKind = useMemo(() => {
    return classifyFieldsByKind(fields, data);
  }, [fields, data]);

  return match(vizConfig)
    .with({ type: "table" }, () => {
      return (
        <DataGrid
          columnNames={fieldNames}
          data={data}
          dateColumns={dateColumns}
          dateFormat="YYYY-MM-DD HH:mm:ss z"
        />
      );
    })
    .with({ type: "bar" }, (config) => {
      const parse = BarChartSettingsSchema.safeParse(config.settings);

      const allowedXAxisNames = CHART_REQUIREMENTS.bar.x.flatMap((kind) => {
        return fieldsByKind[kind];
      });
      const allowedYAxisNames = CHART_REQUIREMENTS.bar.y.flatMap((kind) => {
        return fieldsByKind[kind];
      });

      const isReady =
        parse.success &&
        parse.data.xAxisKey &&
        parse.data.yAxisKey &&
        allowedXAxisNames.includes(parse.data.xAxisKey) &&
        allowedYAxisNames.includes(parse.data.yAxisKey);

      if (!isReady) {
        return (
          <EmptyState message="Pick a time or category for X and a numeric Y to render the bar chart." />
        );
      }

      return (
        <BarChart
          data={data}
          height={700}
          xAxisKey={parse.data.xAxisKey}
          yAxisKey={parse.data.yAxisKey}
        />
      );
    })
    .with({ type: "line" }, (config) => {
      const parse = LineChartSettingsSchema.safeParse(config.settings);

      const allowedXAxisNames = CHART_REQUIREMENTS.line.x.flatMap((kind) => {
        return fieldsByKind[kind];
      });
      const allowedYAxisNames = CHART_REQUIREMENTS.line.y.flatMap((kind) => {
        return fieldsByKind[kind];
      });

      const isReady =
        parse.success &&
        parse.data.xAxisKey &&
        parse.data.yAxisKey &&
        allowedXAxisNames.includes(parse.data.xAxisKey) &&
        allowedYAxisNames.includes(parse.data.yAxisKey);

      if (!isReady) {
        return (
          <EmptyState message="Pick a time or category for X and a numeric Y to render the line chart." />
        );
      }

      return (
        <LineChart
          data={data}
          height={700}
          xAxisKey={parse.data.xAxisKey}
          yAxisKey={parse.data.yAxisKey}
        />
      );
    })
    .exhaustive();
}
