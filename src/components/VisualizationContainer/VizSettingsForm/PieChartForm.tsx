import { useLingui } from "@lingui/react/macro";
import { ColorInput, Fieldset, Stack, Switch } from "@mantine/core";
import { makeSelectOptions, Select } from "@ui";
import { propPasses } from "@utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { UnknownDataFrame } from "@utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { PieChartVizConfig } from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: PieChartVizConfig;
  data: UnknownDataFrame;
  onConfigChange: (newConfig: PieChartVizConfig) => void;
};

/**
 * Settings form for the pie chart. Series-equivalent (name + value) goes
 * first, then chart-level toggles, then per-slice color overrides. Each
 * group is wrapped in a Mantine `<Fieldset>` so the form matches the
 * series-aware viz forms visually.
 */
export function PieChartForm({
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

  const labelsTypeOptions = [
    { label: t`Value`, value: "value" },
    { label: t`Percent`, value: "percent" },
  ];

  const { nameKey, valueKey, isDonut, withLabels, labelsType } = config;

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

      <Fieldset legend={t`Chart settings`}>
        <Stack gap="xs">
          <Switch
            label={t`Donut style`}
            checked={isDonut}
            onChange={(event) => {
              onConfigChange({
                ...config,
                isDonut: event.currentTarget.checked,
              });
            }}
          />

          <Switch
            label={t`Show labels`}
            checked={withLabels}
            onChange={(event) => {
              onConfigChange({
                ...config,
                withLabels: event.currentTarget.checked,
              });
            }}
          />

          {withLabels ?
            <Select
              allowDeselect={false}
              data={labelsTypeOptions}
              label={t`Label type`}
              value={labelsType}
              onChange={(value) => {
                if (value === "value" || value === "percent") {
                  onConfigChange({ ...config, labelsType: value });
                }
              }}
            />
          : null}
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
