import { useUncontrolled } from "@mantine/hooks";
import { useMemo } from "react";
import { Select, SelectOption, SelectProps } from "@/lib/ui/inputs/Select";
import { propIsInArray } from "@/lib/utils/objects/higherOrderFuncs";
import { AvaDataType } from "@/models/datasets/AvaDataType";
import { AvaDataTypes } from "@/models/datasets/AvaDataType/AvaDataTypes";
import { QueryAggregationType } from "@/models/queries/QueryAggregationType";

type Props = {
  dataType: AvaDataType;
  label: string;
  value?: QueryAggregationType;
  defaultValue?: QueryAggregationType;
  onChange?: (aggregation: QueryAggregationType) => void;
} & Omit<
  SelectProps<QueryAggregationType>,
  "value" | "defaultValue" | "onChange"
>;

const AGGREGATION_OPTIONS: Array<SelectOption<QueryAggregationType>> = [
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
  const validAggregations = AvaDataTypes.getValidQueryAggregations(dataType);

  // only show valid aggregations as Select options
  const aggregationOptions = useMemo(() => {
    return AGGREGATION_OPTIONS.filter(
      propIsInArray("value", validAggregations),
    );
  }, [validAggregations]);

  const [currentAggregation, setCurrentAggregation] =
    useUncontrolled<QueryAggregationType>({
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
