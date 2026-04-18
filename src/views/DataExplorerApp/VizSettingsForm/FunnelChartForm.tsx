import { ColorInput, Divider } from "@mantine/core";
import { makeSelectOptions } from "@ui/inputs/Select/makeSelectOptions";
import { Select } from "@ui/inputs/Select/Select";
import { propPasses } from "@utils/objects/hofs/propPasses/propPasses";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { UnknownDataFrame } from "@utils/types/common.types";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { FunnelChartVizConfig } from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: FunnelChartVizConfig;
  data: UnknownDataFrame;
  onConfigChange: (newConfig: FunnelChartVizConfig) => void;
};

export function FunnelChartForm({
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
      fields.filter(propPasses("dataType", AvaDataType.isNumeric)),
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

  const { nameKey, valueKey } = config;

  return (
    <>
      <Select
        allowDeselect
        data={fieldOptions}
        label="Name column"
        value={nameKey}
        disabled={fieldOptions.length === 0}
        placeholder={
          fieldOptions.length === 0 ?
            "No columns are available"
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

      {sliceNames.length > 0 ?
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
      : null}
    </>
  );
}
