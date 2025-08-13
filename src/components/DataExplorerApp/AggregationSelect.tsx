import { useMemo, useState } from "react";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { Select, SelectOption } from "@/lib/ui/inputs/Select";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { getValidQueryAggregationsByType } from "@/models/LocalDataset/LocalDatasetField/utils";

type Props = {
  column: LocalDatasetField;
  value?: QueryAggregationType;
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

export function AggregationSelect({
  column,
  value,
  onChange,
}: Props): JSX.Element {
  const valid = useMemo(() => {
    return new Set(getValidQueryAggregationsByType(column.dataType));
  }, [column.dataType]);

  const data = AGGREGATION_OPTIONS.filter((opt) => {
    return valid.has(opt.value) || opt.value === "none";
  });

  // Uncontrolled fallback
  const [internal, setInternal] = useState<QueryAggregationType>("none");

  const current = value ?? internal;

  const handleChange = (next: QueryAggregationType | null) => {
    if (!next) return;
    if (value === undefined) setInternal(next);
    onChange(next);
  };

  return (
    <Select
      key={column.id}
      label={column.name}
      placeholder="Select aggregation"
      data={data}
      value={current}
      onChange={handleChange}
    />
  );
}
