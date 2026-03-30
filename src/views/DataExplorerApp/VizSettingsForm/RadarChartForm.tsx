import { ColorInput } from "@mantine/core";
import { Select } from "@ui/inputs/Select/Select";
import { makeSelectOptions } from "@ui/inputs/Select/makeSelectOptions";
import { propPasses } from "@utils/objects/hofs/propPasses/propPasses";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import { useMemo } from "react";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: RadarChartVizConfig;
  onConfigChange: (newConfig: RadarChartVizConfig) => void;
};

export function RadarChartForm({
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

  const { nameKey, valueKey } = config;

  return (
    <>
      <Select
        allowDeselect
        data={fieldOptions}
        label="Category column"
        value={nameKey}
        disabled={fieldOptions.length === 0}
        placeholder={
          fieldOptions.length === 0 ? "No columns are available"
          : "Select a column"
        }
        onChange={(field) => {
          onConfigChange({ ...config, nameKey: field ?? undefined });
        }}
      />

      <Select
        allowDeselect
        data={numericFieldOptions}
        label="Value column"
        value={valueKey}
        disabled={numericFieldOptions.length === 0}
        placeholder={
          numericFieldOptions.length === 0 ?
            "There are no numeric columns"
          : "Select a column"
        }
        onChange={(field) => {
          onConfigChange({ ...config, valueKey: field ?? undefined });
        }}
      />

      <ColorInput
        label={valueKey ?? "Series"}
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
