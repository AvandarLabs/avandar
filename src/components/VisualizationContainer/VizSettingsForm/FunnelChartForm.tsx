import { makeSelectOptions, Select } from "@avandar/ui";
import { propPasses } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { ColorInput, Fieldset, Stack } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { FunnelChartVizConfig } from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: FunnelChartVizConfig;
  data: UnknownDataFrame;
  onConfigChange: (newConfig: FunnelChartVizConfig) => void;
};

/**
 * Settings form for the funnel chart. Series-equivalent (name + value)
 * goes first, then per-slice color overrides. Mirrors the pie chart
 * layout.
 */
export function FunnelChartForm({
  fields,
  config,
  data,
  onConfigChange,
}: Props): JSX.Element {
  const { t } = useLingui();
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
    <Stack gap="md">
      <Fieldset legend={t`Series`}>
        <Stack gap="sm">
          <Select
            allowDeselect
            data={fieldOptions}
            label={t`Name column`}
            value={nameKey}
            disabled={fieldOptions.length === 0}
            placeholder={
              fieldOptions.length === 0 ?
                t`No columns are available`
              : t`Select a column`
            }
            onChange={(field) => {
              onConfigChange({ ...config, nameKey: field ?? undefined });
            }}
          />

          <Select
            allowDeselect
            data={numericFieldOptions}
            label={t`Value column`}
            value={valueKey}
            disabled={numericFieldOptions.length === 0}
            placeholder={
              numericFieldOptions.length === 0 ?
                t`There are no numeric columns`
              : t`Select a column`
            }
            onChange={(field) => {
              onConfigChange({ ...config, valueKey: field ?? undefined });
            }}
          />
        </Stack>
      </Fieldset>

      {sliceNames.length > 0 ?
        <Fieldset legend={t`Slice colors`}>
          <Stack gap="xs">
            {sliceNames.map((name) => {
              return (
                <ColorInput
                  key={name}
                  label={name}
                  value={config.seriesColors?.[name] ?? ""}
                  swatches={CHART_COLOR_SWATCHES}
                  withEyeDropper={false}
                  format="hex"
                  popoverProps={{ withinPortal: false }}
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
          </Stack>
        </Fieldset>
      : null}
    </Stack>
  );
}
