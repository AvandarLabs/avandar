import { ColorInput, Divider, Switch } from "@mantine/core";
import { Select } from "@ui/inputs/Select/Select";
import { makeSelectOptions } from "@ui/inputs/Select/makeSelectOptions";
import { propPasses } from "@utils/objects/hofs/propPasses/propPasses";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import { useMemo } from "react";
import type { UnknownDataFrame } from "@utils/types/common.types";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { PieChartVizConfig } from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: PieChartVizConfig;
  data: UnknownDataFrame;
  onConfigChange: (newConfig: PieChartVizConfig) => void;
};

export function PieChartForm({
  fields,
  config,
  data,
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

  const sliceNames = useMemo(() => {
    if (!config.nameKey) {
      return [];
    }
    const seen = new Set<string>();
    data.forEach((row) => {
      const name = String(row[config.nameKey ?? ""] ?? "");
      if (name) {
        seen.add(name);
      }
    });
    return Array.from(seen);
  }, [data, config.nameKey]);

  const labelsTypeOptions = [
    { label: "Value", value: "value" },
    { label: "Percent", value: "percent" },
  ];

  const { nameKey, valueKey, isDonut, withLabels, labelsType } = config;

  return (
    <>
      <Select
        allowDeselect
        data={fieldOptions}
        label="Name column"
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

      <Switch
        label="Donut style"
        checked={isDonut}
        mt="sm"
        onChange={(event) => {
          onConfigChange({ ...config, isDonut: event.currentTarget.checked });
        }}
      />

      <Switch
        label="Show labels"
        checked={withLabels}
        mt="sm"
        onChange={(event) => {
          onConfigChange({
            ...config,
            withLabels: event.currentTarget.checked,
          });
        }}
      />

      {withLabels ? (
        <Select
          allowDeselect={false}
          data={labelsTypeOptions}
          label="Label type"
          value={labelsType}
          mt="xs"
          onChange={(value) => {
            if (value === "value" || value === "percent") {
              onConfigChange({ ...config, labelsType: value });
            }
          }}
        />
      ) : null}

      {sliceNames.length > 0 ? (
        <>
          <Divider label="Slice colors" mt="sm" mb="xs" />
          {sliceNames.map((name) => {
            return (
              <ColorInput
                key={name}
                label={name}
                value={config.seriesColors?.[name] ?? ""}
                mt="xs"
                swatches={CHART_COLOR_SWATCHES}
                withEyeDropper={false}
                format="hex"
                onChange={(value) => {
                  onConfigChange({
                    ...config,
                    seriesColors: {
                      ...config.seriesColors,
                      [name]: value || undefined,
                    } as Record<string, string>,
                  });
                }}
              />
            );
          })}
        </>
      ) : null}
    </>
  );
}
