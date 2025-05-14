import { useUncontrolled } from "@mantine/hooks";
import { useCallback, useEffect, useMemo } from "react";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import {
  SegmentedControl,
  SegmentedControlProps,
} from "@/lib/ui/inputs/SegmentedControl";
import { makeSegmentedControlItems } from "@/lib/ui/inputs/SegmentedControl/makeSegmentedControlItems";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDatasetId } from "@/models/LocalDataset/types";

type Props = {
  datasetId: LocalDatasetId | undefined;
  value?: LocalDatasetFieldId;
  defaultValue?: LocalDatasetFieldId;
  onChange?: (value: LocalDatasetFieldId) => void;
  excludeColumns?: LocalDatasetFieldId[];
} & Omit<SegmentedControlProps<LocalDatasetFieldId>, "data">;

export function LocalDatasetColumnPickerList({
  datasetId,
  defaultValue,
  value,
  onChange,
  excludeColumns,
  ...segmentedControlProps
}: Props): JSX.Element {
  // we use `useUncontrolled` so this SegmentedControl (which is technically a
  // `radio` input) can be used with `useForm`

  const [controlledValue, onChangeValue] = useUncontrolled({
    value,
    defaultValue,
    onChange,
  });

  const [dataset] = LocalDatasetClient.useGetById({
    id: datasetId,
    useQueryOptions: { enabled: !!datasetId },
  });

  const datasetColumnItems = useMemo(() => {
    return makeSegmentedControlItems(
      dataset?.fields?.filter((f) => {
        return !excludeColumns?.includes(f.id);
      }) ?? [],
      {
        valueFn: getProp("id"),
        labelFn: getProp("name"),
      },
    );
  }, [dataset, excludeColumns]);

  useOnBecomesDefined(
    dataset,
    useCallback(
      (dset) => {
        if (dset.fields[0]) {
          onChangeValue(dset.fields[0].id);
        }
      },
      [onChangeValue],
    ),
  );

  useEffect(() => {
    // if the columns to exclude now includes the currently selected value,
    // then let's change the selected value to the first available column
    if (excludeColumns?.includes(controlledValue)) {
      if (datasetColumnItems[0]) {
        onChangeValue(datasetColumnItems[0].value);
      }
    }
  }, [excludeColumns, datasetColumnItems, onChangeValue, controlledValue]);

  return (
    <SegmentedControl
      orientation="vertical"
      data={datasetColumnItems}
      value={controlledValue}
      onChange={onChangeValue}
      {...segmentedControlProps}
    />
  );
}
