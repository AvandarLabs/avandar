import { useMemo } from "react";
import { match } from "ts-pattern";
import { z } from "zod";
import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { UnknownDataFrame } from "@/lib/types/common";
import { BarChart } from "@/lib/ui/data-viz/BarChart";
import { DataGrid } from "@/lib/ui/data-viz/DataGrid";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { isEpochMs, isIsoDateString } from "@/lib/utils/formatters/formatDate";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { VizConfig } from "./VizSettingsForm/makeDefaultVizConfig";

type Props = {
  vizConfig: VizConfig;
  fields: readonly QueryResultField[];
  data: UnknownDataFrame;
};

const BarChartSettingsSchema = z.object({
  xAxisKey: z.string({
    error: (issue) => {
      return issue.input === undefined ?
          "X axis must be specified"
        : "X axis must be a string";
    },
  }),
  yAxisKey: z.string({
    error: (issue) => {
      return issue.input === undefined ?
          "Y axis must be specified"
        : "Y axis must be a string";
    },
  }),
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
    .exhaustive();
}
