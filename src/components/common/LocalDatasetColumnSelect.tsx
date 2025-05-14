import { useUncontrolled } from "@mantine/hooks";
import { useCallback, useMemo } from "react";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import { Select, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDatasetId } from "@/models/LocalDataset/types";

type Props = {
  datasetId: LocalDatasetId | undefined;
  excludeColumns?: LocalDatasetFieldId[];
} & SelectProps<LocalDatasetFieldId>;

export function LocalDatasetColumnSelect({
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

  const [dataset, isLoading] = LocalDatasetClient.useGetById({
    id: datasetId,
    useQueryOptions: { enabled: !!datasetId },
  });

  useOnBecomesDefined(
    dataset,
    useCallback(
      (dset) => {
        onChangeValue(dset.fields[0]?.id ?? null);
      },
      [onChangeValue],
    ),
  );

  const fieldOptions = useMemo(() => {
    return makeSelectOptions(
      dataset?.fields?.filter((f) => {
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
