import { ColorInput, Switch, Tooltip } from "@mantine/core";
import { makeSelectOptions } from "@ui/inputs/Select/makeSelectOptions";
import { Select } from "@ui/inputs/Select/Select";
import { propPasses } from "@utils/objects/hofs/propPasses/propPasses";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: BarChartVizConfig;
  onConfigChange: (newConfig: BarChartVizConfig) => void;
};

export function BarChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  const fieldOptions = useMemo(() => {
    return makeSelectOptions(fields, {
      valueKey: "name",
      labelKey: "name",
    });
  }, [fields]);

  const numericFieldOptions = useMemo(() => {
    return makeSelectOptions(
      fields.filter(propPasses("dataType", AvaDataType.isNumeric)),
      {
        valueKey: "name",
        labelKey: "name",
      },
    );
  }, [fields]);
  const { xAxisKey, yAxisKey, withLegend } = config;
  const xAxisDisabled = fieldOptions.length === 0;
  const yAxisDisabled =
    fieldOptions.length === 0 || numericFieldOptions.length === 0;

  const noColumnsTooltipMsg =
    "You need to add at least one column so there can be options available here";
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
            onConfigChange({ ...config, xAxisKey: field ?? undefined });
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
            onConfigChange({ ...config, yAxisKey: field ?? undefined });
          }}
        />
      </Tooltip>

      <Switch
        label="Show legend"
        checked={withLegend}
        mt="sm"
        onChange={(event) => {
          onConfigChange({
            ...config,
            withLegend: event.currentTarget.checked,
          });
        }}
      />

      <ColorInput
        label={yAxisKey ?? "Series"}
        value={config.color ?? ""}
        mt="sm"
        swatches={CHART_COLOR_SWATCHES}
        withEyeDropper={false}
        format="hex"
        onChange={(value) => {
          onConfigChange({ ...config, color: value || undefined });
        }}
      />
    </>
  );
}
