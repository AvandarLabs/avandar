import { useUncontrolled } from "@mantine/hooks";
import { useMemo } from "react";
import { QueryAggregationType } from "@/clients/DuckDBClient/types";
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
  const validAggregations = useMemo(() => {
    return new Set(getValidQueryAggregationsByType(column.dataType));
  }, [column.dataType]);

  const aggregationOptions = useMemo(() => {
    return AGGREGATION_OPTIONS.filter((opt) => {
      return validAggregations.has(opt.value) || opt.value === "none";
    });
  }, [validAggregations]);

  // Controlled if `value` is provided,
  // otherwise uncontrolled with internal state.
  const [currentAggregations, setCurrentAggregations] =
    useUncontrolled<QueryAggregationType>({
      value,
      defaultValue,
      finalValue: "none",
      onChange,
    });

  const aggregationToUse =
    (
      currentAggregations !== "none" &&
      !validAggregations.has(currentAggregations)
    ) ?
      "none"
    : currentAggregations;

  return (
    <Select
      // key for hard reset
      key={column.id}
      label={column.name}
      placeholder="Select aggregation"
      data={aggregationOptions}
      value={aggregationToUse}
      onChange={(newValue) => {
        if (newValue) {
          setCurrentAggregations(newValue);
        }
      }}
    />
  );
}
