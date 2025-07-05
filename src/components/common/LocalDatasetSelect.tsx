import { useUncontrolled } from "@mantine/hooks";
import { useCallback, useMemo } from "react";
import { match } from "ts-pattern";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import { useCurrentWorkspace } from "@/lib/hooks/workspaces/useCurrentWorkspace";
import { Select, SelectOptionGroup, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { where } from "@/lib/utils/filters/filterBuilders";
import { makeBucketMapFromList } from "@/lib/utils/maps/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import { isDatasetViewableType } from "@/models/LocalDataset/utils";

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
  const workspace = useCurrentWorkspace();
  const [controlledValue, onChangeValue] = useUncontrolled({
    value,
    defaultValue,
    finalValue: null,
    onChange,
  });

  const [datasets] = LocalDatasetClient.useGetAll(
    where("workspaceId", "eq", workspace.id),
  );
  const viewableDatasets = useMemo(() => {
    return datasets?.filter(isDatasetViewableType) ?? [];
  }, [datasets]);

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
    const datasetBucketsByType = makeBucketMapFromList(viewableDatasets ?? [], {
      keyFn: getProp("datasetType"),
    });

    if (datasetBucketsByType.size === 1) {
      return makeSelectOptions(viewableDatasets ?? [], {
        valueFn: getProp("id"),
        labelFn: getProp("name"),
      });
    }

    // if we have more than 1 bucket that means we need to group things
    const groups: Array<SelectOptionGroup<LocalDatasetId>> = [];
    datasetBucketsByType.forEach((bucketValues, bucketKey) => {
      const bucketName = match(bucketKey)
        .with("upload", () => {
          return "Datasets";
        })
        .with("entities_queryable", () => {
          return "Profiles";
        })
        .with("entities", "entity_field_values", () => {
          return "Entity Field Values";
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
  }, [viewableDatasets]);

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
