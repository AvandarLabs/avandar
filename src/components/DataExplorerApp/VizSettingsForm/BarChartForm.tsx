import { Tooltip } from "@mantine/core";
import { useMemo } from "react";
import { QueryResultColumn } from "@/clients/DuckDBClient/types";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { propPasses } from "@/lib/utils/objects/higherOrderFuncs";
import { AvaDataTypeUtils } from "@/models/datasets/AvaDataType";

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
      valueKey: "name",
      labelKey: "name",
    });
  }, [fields]);

  const numericFieldOptions = useMemo(() => {
    return makeSelectOptions(
      fields.filter(propPasses("dataType", AvaDataTypeUtils.isNumeric)),
      {
        valueKey: "name",
        labelKey: "name",
      },
    );
  }, [fields]);

  const { xAxisKey, yAxisKey } = settings;

  const xAxisDisabled = fieldOptions.length === 0;
  const yAxisDisabled =
    fieldOptions.length === 0 || numericFieldOptions.length === 0;

  const noColumnsTooltipMsg =
    "You need to query for at least one column so there can be options available here";
  return (
    <>
      <Tooltip disabled={!xAxisDisabled} label={noColumnsTooltipMsg}>
        <Select
          allowDeselect
          data={fieldOptions}
          label="X Axis"
          value={xAxisKey}
          disabled={fieldOptions.length === 0}
          placeholder={
            fieldOptions.length === 0 ?
              "No columns are available"
            : "Select a column"
          }
          onChange={(field) => {
            onSettingsChange({ ...settings, xAxisKey: field ?? undefined });
          }}
        />
      </Tooltip>

      <Tooltip
        disabled={!yAxisDisabled}
        label={
          fieldOptions.length === 0 ?
            noColumnsTooltipMsg
          : "A bar chart requires a numeric Y axis but you have not queried for any columns that contain numbers"
        }
      >
        <Select
          data={numericFieldOptions}
          label="Y Axis"
          value={yAxisKey}
          disabled={
            fieldOptions.length === 0 || numericFieldOptions.length === 0
          }
          placeholder={
            fieldOptions.length === 0 ? "No columns are available"
            : numericFieldOptions.length === 0 ?
              "There are no numeric columns"
            : "Select a column"
          }
          onChange={(field) => {
            onSettingsChange({ ...settings, yAxisKey: field ?? undefined });
          }}
        />
      </Tooltip>
    </>
  );
}
