import { makeSelectOptions, Select } from "@avandar/ui";
import { isDefined, propPasses } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useMemo } from "react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { SliceColorFields } from "@/components/VisualizationContainer/VizSettingsForm/SliceColorFields";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { FunnelChartVizConfig } from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types";
import type {
  SettingsColumnGroup,
  SettingsColumnsLayout,
} from "@/components/SettingsColumns/SettingsColumns";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: FunnelChartVizConfig;
  data: UnknownDataFrame;
  onConfigChange: (newConfig: FunnelChartVizConfig) => void;

  /** How the setting groups are arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
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
  layout = "stacked",
}: Props): JSX.Element {
  const { t } = useLingui();
  const fieldOptions = useMemo(() => {
    return makeSelectOptions(fields, { valueKey: "id", labelKey: "name" });
  }, [fields]);

  const numericFieldOptions = useMemo(() => {
    return makeSelectOptions(
      fields.filter(propPasses("dataType", AvaDataType.isNumeric)),
      { valueKey: "id", labelKey: "name" },
    );
  }, [fields]);

  const sliceNames = useMemo(() => {
    if (!config.nameKey) {
      return [];
    }
    const seen = new Set<string>();
    data.forEach((row) => {
      const name = String(
        row[
          fields.find((column) => {
            return column.id === config.nameKey;
          })?.name ?? ""
        ] ?? "",
      );
      if (name) {
        seen.add(name);
      }
    });
    return Array.from(seen);
  }, [data, config.nameKey, fields]);

  const { nameKey, valueKey } = config;

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
              onConfigChange({
                ...config,
                nameKey: fields.find((column) => {
                  return column.id === field;
                })?.id,
              });
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
              onConfigChange({
                ...config,
                valueKey: fields.find((column) => {
                  return column.id === field;
                })?.id,
              });
            }}
          />
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
