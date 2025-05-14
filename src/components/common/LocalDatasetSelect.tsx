import { usePrevious, useUncontrolled } from "@mantine/hooks";
import { useCallback, useEffect, useMemo } from "react";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import { Select, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetId } from "@/models/LocalDataset/types";

type Props = SelectProps<LocalDatasetId>;

/**
 * A select component for selecting a local dataset.
 * This queries for the list of LocalDatasets on its own, it does not
 * need to be passed a list of datasets.
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
  const [controlledValue, onChangeValue] = useUncontrolled({
    value,
    defaultValue,
    finalValue: null,
    onChange,
  });

  const [datasets] = LocalDatasetClient.useGetAll();

  useOnBecomesDefined(
    datasets,
    useCallback(
      (dsets) => {
        onChangeValue(dsets[0]?.id ?? null);
      },
      [onChangeValue],
    ),
  );

  const datasetOptions = useMemo(() => {
    return makeSelectOptions(datasets ?? [], {
      valueFn: getProp("id"),
      labelFn: getProp("name"),
    });
  }, [datasets]);

  return (
    <Select
      data={datasetOptions}
      label="Dataset"
      value={controlledValue}
      onChange={onChangeValue}
      {...selectProps}
    />
  );
}
