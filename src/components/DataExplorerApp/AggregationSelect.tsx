import { useMemo } from "react";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { Select, SelectOption } from "@/lib/ui/inputs/Select";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { getValidQueryAggregationsByType } from "@/models/LocalDataset/LocalDatasetField/utils";

type Props = {
  column: LocalDatasetField;
  onChange: (aggregation: QueryAggregationType) => void;
};

const AGGREGATION_OPTIONS: Array<SelectOption<QueryAggregationType>> = [
  { value: "none", label: "None" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "count", label: "Count" },
  { value: "max", label: "Max" },
  { value: "min", label: "Min" },
];

export function AggregationSelect({ column, onChange }: Props): JSX.Element {
  const validAggregations = useMemo(() => {
    return new Set(getValidQueryAggregationsByType(column.dataType));
  }, [column.dataType]);

  const aggregationOptions = AGGREGATION_OPTIONS.filter((option) => {
    return validAggregations.has(option.value) || option.value === "none";
  });

  return (
    <Select
      key={column.id}
      label={column.name}
      placeholder="Select aggregation"
      defaultValue="none"
      data={aggregationOptions}
      onChange={(value: QueryAggregationType | null) => {
        if (value === null) {
          return;
        }
        onChange(value);
      }}
    />
  );
}
