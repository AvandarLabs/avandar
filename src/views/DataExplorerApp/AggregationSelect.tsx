import { Select } from "@avandar/ui";
import { propIsInArray } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useUncontrolled } from "@mantine/hooks";
import { AvaDataType as AvaDataTypeFns } from "$/models/datasets/AvaDataType/AvaDataType";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { SelectOption, SelectProps } from "@avandar/ui";

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

/**
 * Returns the localized aggregation options. Defined as a hook so the labels
 * can use the active translation function.
 */
function useAggregationOptions(): Array<SelectOption<QueryAggregationType.T>> {
  const { t } = useLingui();
  return [
    { value: "none", label: t`None` },
    { value: "group_by", label: t`Group by` },
    { value: "sum", label: t`Sum` },
    { value: "avg", label: t`Average` },
    { value: "count", label: t`Count` },
    { value: "max", label: t`Max` },
    { value: "min", label: t`Min` },
  ];
}

export function AggregationSelect({
  dataType,
  label,
  value,
  defaultValue,
  onChange,
  ...selectProps
}: Props): JSX.Element {
  const { t } = useLingui();
  const allAggregationOptions = useAggregationOptions();
  const validAggregations = AvaDataTypeFns.getValidQueryAggregations(dataType);

  // only show valid aggregations as Select options
  const aggregationOptions = allAggregationOptions.filter(
    propIsInArray("value", validAggregations),
  );

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
      placeholder={t`Select aggregation`}
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
