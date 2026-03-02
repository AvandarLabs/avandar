import { useMemo } from "react";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { propPasses } from "@/lib/utils/objects/higherOrderFuncs";
import { AvaDataTypes } from "@/models/datasets/AvaDataType";
import { QueryResultColumn } from "@/models/queries/QueryResult/QueryResult.types";
import { LineChartVizConfig } from "@/models/vizs/LineChartVizConfig";

type Props = {
  fields: readonly QueryResultColumn[];
  config: LineChartVizConfig;
  onConfigChange: (newConfig: LineChartVizConfig) => void;
};

export function LineChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  const fieldOptions = useMemo(() => {
    return makeSelectOptions(fields, { valueKey: "name", labelKey: "name" });
  }, [fields]);

  const numericFieldOptions = useMemo(() => {
    return makeSelectOptions(
      fields.filter(propPasses("dataType", AvaDataTypes.isNumeric)),
      { valueKey: "name", labelKey: "name" },
    );
  }, [fields]);

  const { xAxisKey, yAxisKey } = config;

  return (
    <>
      <Select
        allowDeselect
        data={fieldOptions}
        label="X Axis"
        value={xAxisKey}
        disabled={fieldOptions.length === 0}
        placeholder={
          fieldOptions.length === 0 ?
            "No fields have been queried"
          : "Select a field"
        }
        onChange={(field) => {
          return onConfigChange({
            ...config,
            xAxisKey: field ?? undefined,
          });
        }}
      />

      <Select
        allowDeselect
        data={numericFieldOptions}
        label="Y Axis"
        value={yAxisKey}
        disabled={fieldOptions.length === 0 || numericFieldOptions.length === 0}
        placeholder={
          fieldOptions.length === 0 ? "No fields have been queried"
          : numericFieldOptions.length === 0 ?
            "There are no queried numeric fields"
          : "Select a field"
        }
        onChange={(field) => {
          return onConfigChange({
            ...config,
            yAxisKey: field ?? undefined,
          });
        }}
      />
    </>
  );
}
