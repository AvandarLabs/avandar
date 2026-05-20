import { useLingui } from "@lingui/react/macro";
import { ColorInput, Divider, Switch } from "@mantine/core";
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
    <>
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

      <Switch
        label={t`Donut style`}
        checked={isDonut}
        mt="sm"
        onChange={(event) => {
          onConfigChange({ ...config, isDonut: event.currentTarget.checked });
        }}
      />

      <Switch
        label={t`Show labels`}
        checked={withLabels}
        mt="sm"
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
          mt="xs"
          onChange={(value) => {
            if (value === "value" || value === "percent") {
              onConfigChange({ ...config, labelsType: value });
            }
          }}
        />
      : null}

      {sliceNames.length > 0 ?
        <>
          <Divider label={t`Slice colors`} mt="sm" mb="xs" />
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
