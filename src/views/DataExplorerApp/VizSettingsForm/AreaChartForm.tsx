import { ColorInput, Switch } from "@mantine/core";
import { Select } from "@ui/inputs/Select/Select";
import { makeSelectOptions } from "@ui/inputs/Select/makeSelectOptions";
import { propPasses } from "@utils/objects/hofs/propPasses/propPasses";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import { useMemo } from "react";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: AreaChartVizConfig;
  onConfigChange: (newConfig: AreaChartVizConfig) => void;
};

const CURVE_TYPE_OPTIONS = [
  { label: "Monotone (smooth)", value: "monotone" },
  { label: "Natural (smooth)", value: "natural" },
  { label: "Linear (straight)", value: "linear" },
  { label: "Step", value: "step" },
];

export function AreaChartForm({
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

  const { xAxisKey, yAxisKey, withLegend, curveType } = config;

  return (
    <>
      <Select
        allowDeselect
        data={fieldOptions}
        label="X Axis"
        value={xAxisKey}
        disabled={fieldOptions.length === 0}
        placeholder={
          fieldOptions.length === 0 ? "No fields have been queried"
          : "Select a field"
        }
        onChange={(field) => {
          onConfigChange({ ...config, xAxisKey: field ?? undefined });
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
          onConfigChange({ ...config, yAxisKey: field ?? undefined });
        }}
      />

      <Select
        allowDeselect={false}
        data={CURVE_TYPE_OPTIONS}
        label="Curve style"
        value={curveType}
        mt="xs"
        onChange={(value) => {
          if (
            value === "monotone" ||
            value === "natural" ||
            value === "linear" ||
            value === "step"
          ) {
            onConfigChange({ ...config, curveType: value });
          }
        }}
      />

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
