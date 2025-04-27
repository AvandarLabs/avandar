import { useUncontrolled } from "@mantine/hooks";
import { useMemo } from "react";
import { Select, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDatasetId } from "@/models/LocalDataset/types";

type Props = {
  datasetId: LocalDatasetId | undefined;
} & SelectProps<LocalDatasetFieldId>;

export function LocalDatasetFieldSelect({
  datasetId,

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

  const [dataset, isLoading] = LocalDatasetClient.useGetById({
    id: datasetId,
    useQueryOptions: { enabled: !!datasetId },
  });

  const fieldOptions = useMemo(() => {
    return makeSelectOptions({
      list: dataset?.fields ?? [],
      valueFn: getProp("id"),
      labelFn: getProp("name"),
    });
  }, [dataset]);

  return (
    <Select
      data={fieldOptions}
      label="Field"
      value={controlledValue}
      placeholder={isLoading ? "Loading fields..." : ""}
      onChange={(val) => {
        return innerOnChange(val as LocalDatasetFieldId);
      }}
      {...selectProps}
    />
  );
}
