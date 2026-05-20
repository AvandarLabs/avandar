import { useLingui } from "@lingui/react/macro";
import { makeSelectOptions, Select } from "@ui";
import { propPasses } from "@utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: ScatterPlotVizConfig;
  onConfigChange: (newConfig: ScatterPlotVizConfig) => void;
};

export function ScatterChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const numericFields = useMemo(() => {
    return fields.filter(propPasses("dataType", AvaDataType.isNumeric));
  }, [fields]);

  const numericOptions = useMemo(() => {
    return makeSelectOptions(numericFields, {
      valueKey: "name",
      labelKey: "name",
    });
  }, [numericFields]);

  const { xAxisKey, yAxisKey } = config;

  return (
    <>
      <Select
        allowDeselect
        data={numericOptions}
        label={t`X Axis (numeric)`}
        value={xAxisKey}
        disabled={numericOptions.length === 0}
        placeholder={
          numericOptions.length === 0 ?
            t`There are no queried numeric fields`
          : t`Select a field`
        }
        onChange={(field) => {
          return onConfigChange({
            ...config,
            xAxisKey: field ?? undefined,
          });
        }}
      />

      <Select
        allowDeselect
        data={numericOptions}
        label={t`Y Axis (numeric)`}
        value={yAxisKey}
        disabled={numericOptions.length === 0}
        placeholder={
          numericOptions.length === 0 ?
            t`There are no queried numeric fields`
          : t`Select a field`
        }
        onChange={(field) => {
          return onConfigChange({
            ...config,
            yAxisKey: field ?? undefined,
          });
        }}
      />
    </>
  );
}
