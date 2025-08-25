import { useUncontrolled } from "@mantine/hooks";
import { useCallback, useMemo } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datsets/DatasetClient";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import { Select, SelectOptionGroup, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { makeBucketMapFromList } from "@/lib/utils/maps/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { DatasetId } from "@/models/datasets/Dataset";

type Props = SelectProps<DatasetId>;

/**
 * A select component for selecting a dataset.
 * This queries for the list of Datasets on its own, it does not
 * need to be passed a list of datasets.
 *
 * This supports controlled and uncontrolled behavior and can be used
 * with `useForm`.
 */
export function DatasetSelect({
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

  const [datasets] = DatasetClient.useGetAll();

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
    const datasetBucketsByType = makeBucketMapFromList(datasets ?? [], {
      keyFn: getProp("sourceType"),
    });

    if (datasetBucketsByType.size === 1) {
      return makeSelectOptions(datasets ?? [], {
        valueFn: getProp("id"),
        labelFn: getProp("name"),
      });
    }

    // if we have more than 1 bucket that means we need to group things
    const groups: Array<SelectOptionGroup<DatasetId>> = [];
    datasetBucketsByType.forEach((bucketValues, bucketKey) => {
      const bucketName = match(bucketKey)
        .with("local_csv", () => {
          return "CSVs";
        })
        .with("google_sheets", () => {
          return "Google Sheets";
        })
        .exhaustive(() => {
          return undefined;
        });
      if (bucketName) {
        groups.push({
          group: bucketName,
          items: makeSelectOptions(bucketValues, {
            valueFn: getProp("id"),
            labelFn: getProp("name"),
          }),
        });
      }
    });

    return groups;
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
