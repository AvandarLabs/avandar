import { Select } from "@ui/inputs/Select/Select";
import { makeSelectOptions } from "@ui/inputs/Select/makeSelectOptions";
import { propPasses } from "@utils/objects/hofs/propPasses/propPasses";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes";
import { useMemo } from "react";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { FunnelChartVizConfig } from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: FunnelChartVizConfig;
  onConfigChange: (newConfig: FunnelChartVizConfig) => void;
};

export function FunnelChartForm({
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
    </>
  );
}
