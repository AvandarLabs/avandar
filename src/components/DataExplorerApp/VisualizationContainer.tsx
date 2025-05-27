import { useMemo } from "react";
import { match } from "ts-pattern";
import { z } from "zod";
import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { UnknownDataFrame } from "@/lib/types/common";
import { BarChart } from "@/lib/ui/data-viz/BarChart";
import { DataGrid } from "@/lib/ui/data-viz/DataGrid";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { VizConfig } from "./VizSettingsForm/makeDefaultVizConfig";

type Props = {
  vizConfig: VizConfig;
  fields: readonly QueryResultField[];
  data: UnknownDataFrame;
};

const BarChartSettingsSchema = z.object({
  xAxisKey: z.string({
    errorMap: (issue: z.ZodIssueOptionalMessage, ctx: z.ErrorMapCtx) => {
      const errorMessage = match(issue.code)
        .with(z.ZodIssueCode.invalid_type, () => {
          return ctx.data === undefined ?
              "X axis must be specified"
            : "X axis must be a string";
        })
        .otherwise(constant(ctx.defaultError));
      return { message: errorMessage };
    },
  }),
  yAxisKey: z.string({
    errorMap: (issue: z.ZodIssueOptionalMessage, ctx: z.ErrorMapCtx) => {
      const errorMessage = match(issue.code)
        .with(z.ZodIssueCode.invalid_type, () => {
          return ctx.data === undefined ?
              "Y axis must be specified"
            : "Y axis must be a string";
        })
        .otherwise(constant(ctx.defaultError));
      return { message: errorMessage };
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

  return match(vizConfig)
    .with({ type: "table" }, () => {
      return <DataGrid columnNames={fieldNames} data={data} />;
    })
    .with({ type: "bar" }, (config) => {
      const {
        success,
        data: settings,
        error,
      } = BarChartSettingsSchema.safeParse(config.settings);

      console.log(data);

      if (success) {
        return <BarChart data={data} height={700} {...settings} />;
      }
      const errorMessages = error.errors.map(getProp("message"));
      return <DangerText>{errorMessages.join(", ")}</DangerText>;
    })
    .exhaustive();
}
