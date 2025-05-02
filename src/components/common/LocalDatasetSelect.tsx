import { useUncontrolled } from "@mantine/hooks";
import { useMemo } from "react";
import { Select, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetId } from "@/models/LocalDataset/types";

type Props = SelectProps<LocalDatasetId>;

/**
 * A select component for selecting a local dataset.
 *
 * This supports controlled and uncontrolled behavior and can be used
 * with `useForm`.
 */
export function LocalDatasetSelect({
  defaultValue,
  value,
  onChange,
  ...selectProps
}: Props): JSX.Element {
  const [controlledValue, innerOnChange] = useUncontrolled({
    value,
    defaultValue,
    finalValue: null,
    onChange,
  });

  const [datasets] = LocalDatasetClient.useGetAll();
  const datasetOptions = useMemo(() => {
    return makeSelectOptions({
      list: datasets ?? [],
      valueFn: getProp("id"),
      labelFn: getProp("name"),
    });
  }, [datasets]);

  return (
    <Select
      data={datasetOptions}
      label="Dataset"
      value={controlledValue}
      onChange={(val) => {
        return innerOnChange(val as LocalDatasetId);
      }}
      {...selectProps}
    />
  );
}
