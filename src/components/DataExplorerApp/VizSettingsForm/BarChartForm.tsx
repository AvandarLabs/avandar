import { useMemo } from "react";
import { QueryResultColumn } from "@/clients/DuckDBClient/types";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";

export type BarChartSettings = {
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
};

type Props = {
  fields: readonly QueryResultColumn[];
  settings: BarChartSettings;
  onSettingsChange: (settings: BarChartSettings) => void;
};

export function BarChartForm({
  fields,
  settings,
  onSettingsChange,
}: Props): JSX.Element {
  const fieldOptions = useMemo(() => {
    return makeSelectOptions(fields, {
      valueFn: getProp("name"),
      labelFn: getProp("name"),
    });
  }, [fields]);

  const numericFieldOptions = useMemo(() => {
    return makeSelectOptions(fields.filter(propEquals("dataType", "number")), {
      valueFn: getProp("name"),
      labelFn: getProp("name"),
    });
  }, [fields]);

  const { xAxisKey, yAxisKey } = settings;

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
          onSettingsChange({ ...settings, xAxisKey: field ?? undefined });
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
          onSettingsChange({ ...settings, yAxisKey: field ?? undefined });
        }}
      />
    </>
  );
}
