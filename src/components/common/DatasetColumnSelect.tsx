import { useUncontrolled } from "@mantine/hooks";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import { Select, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetColumnId } from "@/models/datasets/DatasetColumn";

type Props = {
  datasetId: DatasetId | undefined;
  excludeColumns?: DatasetColumnId[];
} & SelectProps<DatasetColumnId>;

export function DatasetColumnSelect({
  datasetId,
  defaultValue,
  value,
  onChange,
  excludeColumns,
  ...selectProps
}: Props): JSX.Element {
  const [controlledValue, onChangeValue] = useUncontrolled({
    value,
    defaultValue,
    finalValue: null,
    onChange,
  });

  const [dataset, isLoading] = DatasetClient.useGetWithColumns({
    id: datasetId,
    useQueryOptions: { enabled: !!datasetId },
  });

  useOnBecomesDefined(dataset, (dset) => {
    onChangeValue(dset.columns[0]?.id ?? null);
  });

  const fieldOptions = useMemo(() => {
    return makeSelectOptions(
      dataset?.columns?.filter((f) => {
        return !excludeColumns?.includes(f.id);
      }) ?? [],
      {
        valueFn: getProp("id"),
        labelFn: getProp("name"),
      },
    );
  }, [dataset, excludeColumns]);

  return (
    <Select
      data={fieldOptions}
      label="Field"
      value={controlledValue}
      placeholder={isLoading ? "Loading fields..." : ""}
      onChange={onChangeValue}
      {...selectProps}
    />
  );
}
