import { makeSelectOptions, Select } from "@avandar/ui";
import { isDefined, propPasses } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Stack, Switch } from "@mantine/core";
import { useMemo } from "react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { SliceColorFields } from "@/components/VisualizationContainer/VizSettingsForm/SliceColorFields";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { PieChartVizConfig } from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types";
import type {
  SettingsColumnGroup,
  SettingsColumnsLayout,
} from "@/components/SettingsColumns/SettingsColumns";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  fields: readonly QueryResultColumn[];
  config: PieChartVizConfig;
  data: UnknownDataFrame;
  onConfigChange: (newConfig: PieChartVizConfig) => void;

  /** How the setting groups are arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
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
  layout = "stacked",
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

  const groups: SettingsColumnGroup[] = [
    {
      id: "series",
      title: t`Series`,
      content: (
        <Stack gap="sm">
          <Select
            allowDeselect
            data={fieldOptions}
            label={t`Name column`}
            value={nameKey}
            disabled={fieldOptions.length === 0}
            placeholder={
              fieldOptions.length === 0
                ? t`No columns are available`
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
              numericFieldOptions.length === 0
                ? t`There are no numeric columns`
                : t`Select a column`
            }
            onChange={(field) => {
              onConfigChange({ ...config, valueKey: field ?? undefined });
            }}
          />
        </Stack>
      ),
    },
    {
      id: "chart-settings",
      title: t`Chart settings`,
      content: (
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

          {withLabels ? (
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
          ) : null}
        </Stack>
      ),
    },
    sliceNames.length > 0
      ? {
          id: "slice-colors",
          title: t`Slice colors`,
          content: (
            <SliceColorFields
              sliceNames={sliceNames}
              seriesColors={config.seriesColors}
              onSeriesColorsChange={(
                nextSeriesColors: Record<string, string>,
              ) => {
                onConfigChange({ ...config, seriesColors: nextSeriesColors });
              }}
            />
          ),
        }
      : undefined,
  ].filter(isDefined);

  return <SettingsColumns groups={groups} layout={layout} />;
}
