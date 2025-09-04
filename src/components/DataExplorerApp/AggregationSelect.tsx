import { useUncontrolled } from "@mantine/hooks";
import { useEffect, useMemo } from "react";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { Select, SelectOption } from "@/lib/ui/inputs/Select";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { getValidQueryAggregationsByType } from "@/models/datasets/DatasetColumn/utils";

type Props = {
  column: DatasetColumn;
  value?: QueryAggregationType;
  defaultValue?: QueryAggregationType;
  onChange?: (aggregation: QueryAggregationType) => void;
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
  defaultValue = "none",
  onChange,
}: Props): JSX.Element {
  const validSet = useMemo(() => {
    return new Set(getValidQueryAggregationsByType(column.dataType));
  }, [column.dataType]);

  const data = AGGREGATION_OPTIONS.filter((opt) => {
    return validSet.has(opt.value) || opt.value === "none";
  });

  // Controlled if `value` is provided,
  // otherwise uncontrolled with internal state.
  const [current, setCurrent] = useUncontrolled<QueryAggregationType>({
    value,
    defaultValue,
    finalValue: "none",
    onChange,
  });

  // If the column type changes and the current aggregation becomes invalid,
  // coerce it to "none" (and notify parent if controlled).
  useEffect(() => {
    if (current !== "none" && !validSet.has(current)) {
      setCurrent("none");
    }
  }, [current, column.dataType, validSet, setCurrent]);

  return (
    <Select
      // key for hard reset
      key={column.id}
      label={column.name}
      placeholder="Select aggregation"
      data={data}
      value={current}
      onChange={(next) => {
        if (!next) {
          return;
        }
        setCurrent(next);
      }}
    />
  );
}
