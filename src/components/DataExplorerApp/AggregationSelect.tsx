import { useUncontrolled } from "@mantine/hooks";
import { useMemo } from "react";
import { QueryAggregationType } from "@/clients/DuckDBClient/types";
import { Select, SelectOption } from "@/lib/ui/inputs/Select";
import { AvaDataTypeUtils } from "@/models/datasets/AvaDataType/AvaDataTypeUtils";
import { QueryableColumn } from "./QueryableColumnMultiSelect";

type Props = {
  column: QueryableColumn;
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
  const validAggregations = AvaDataTypeUtils.getValidQueryAggregations(
    column.type === "DatasetColumn" ?
      column.value.dataType
    : column.value.options.baseDataType,
  );

  const aggregationOptions = useMemo(() => {
    return AGGREGATION_OPTIONS.filter((opt) => {
      return validAggregations.includes(opt.value) || opt.value === "none";
    });
  }, [validAggregations]);

  const [currentAggregation, setCurrentAggregation] =
    useUncontrolled<QueryAggregationType>({
      value,
      defaultValue,
      finalValue: "none",
      onChange,
    });

  const isValidAggregation = validAggregations.includes(currentAggregation);
  const aggregationToUse =
    currentAggregation !== "none" && !isValidAggregation ?
      "none"
    : currentAggregation;

  return (
    <Select
      // key for hard reset
      key={column.value.id}
      label={column.value.name}
      placeholder="Select aggregation"
      data={aggregationOptions}
      value={aggregationToUse}
      onChange={(newValue) => {
        if (newValue) {
          setCurrentAggregation(newValue);
        }
      }}
    />
  );
}
