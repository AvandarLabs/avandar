import { useMemo } from "react";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { propPasses } from "@/lib/utils/objects/higherOrderFuncs";
import { AvaDataTypeUtils } from "@/models/datasets/AvaDataType";
import { QueryResultColumn } from "@/models/queries/QueryResultData/QueryResultData.types";

export type ScatterChartSettings = {
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
};

type Props = {
  fields: readonly QueryResultColumn[];
  settings: ScatterChartSettings;
  onSettingsChange: (settings: ScatterChartSettings) => void;
};

export function ScatterChartForm({
  fields,
  settings,
  onSettingsChange,
}: Props): JSX.Element {
  const numericFields = useMemo(() => {
    return fields.filter(propPasses("dataType", AvaDataTypeUtils.isNumeric));
  }, [fields]);

  const numericOptions = useMemo(() => {
    return makeSelectOptions(numericFields, {
      valueKey: "name",
      labelKey: "name",
    });
  }, [numericFields]);

  const { xAxisKey, yAxisKey } = settings;

  return (
    <>
      <Select
        allowDeselect
        data={numericOptions}
        label="X Axis (numeric)"
        value={xAxisKey}
        disabled={numericOptions.length === 0}
        placeholder={
          numericOptions.length === 0 ?
            "There are no queried numeric fields"
          : "Select a field"
        }
        onChange={(field) => {
          return onSettingsChange({
            ...settings,
            xAxisKey: field ?? undefined,
          });
        }}
      />

      <Select
        allowDeselect
        data={numericOptions}
        label="Y Axis (numeric)"
        value={yAxisKey}
        disabled={numericOptions.length === 0}
        placeholder={
          numericOptions.length === 0 ?
            "There are no queried numeric fields"
          : "Select a field"
        }
        onChange={(field) => {
          return onSettingsChange({
            ...settings,
            yAxisKey: field ?? undefined,
          });
        }}
      />
    </>
  );
}
