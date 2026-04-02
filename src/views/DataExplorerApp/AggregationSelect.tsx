import { useUncontrolled } from "@mantine/hooks";
import { Select } from "@ui/inputs/Select/Select";
import { propIsInArray } from "@utils/objects/hofs/propIsInArray/propIsInArray";
import { AvaDataType as AvaDataTypeFns } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import type { SelectOption, SelectProps } from "@ui/inputs/Select/Select";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";

type Props = {
  dataType: AvaDataType.T;
  label: string;
  value?: QueryAggregationType.T;
  defaultValue?: QueryAggregationType.T;
  onChange?: (aggregation: QueryAggregationType.T) => void;
} & Omit<
  SelectProps<QueryAggregationType.T>,
  "value" | "defaultValue" | "onChange"
>;

const AGGREGATION_OPTIONS: Array<SelectOption<QueryAggregationType.T>> = [
  { value: "none", label: "None" },
  { value: "group_by", label: "Group by" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "count", label: "Count" },
  { value: "max", label: "Max" },
  { value: "min", label: "Min" },
];

export function AggregationSelect({
  dataType,
  label,
  value,
  defaultValue,
  onChange,
  ...selectProps
}: Props): JSX.Element {
  const validAggregations = AvaDataTypeFns.getValidQueryAggregations(dataType);

  // only show valid aggregations as Select options
  const aggregationOptions = useMemo(() => {
    return AGGREGATION_OPTIONS.filter(
      propIsInArray("value", validAggregations),
    );
  }, [validAggregations]);

  const [currentAggregation, setCurrentAggregation] =
    useUncontrolled<QueryAggregationType.T>({
      value,
      defaultValue,
      finalValue: "none",
      onChange,
    });

  return (
    <Select
      label={label}
      placeholder="Select aggregation"
      data={aggregationOptions}
      value={currentAggregation}
      onChange={(newValue) => {
        if (newValue) {
          setCurrentAggregation(newValue);
        }
      }}
      {...selectProps}
    />
  );
}
