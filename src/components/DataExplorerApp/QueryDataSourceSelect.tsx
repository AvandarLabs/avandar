import { useUncontrolled } from "@mantine/hooks";
import { where } from "$/lib/utils/filters/filters";
import { useCallback, useMemo } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import {
  Select,
  SelectData,
  SelectOptionGroup,
  SelectProps,
} from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { makeBucketMap } from "@/lib/utils/maps/makeBucketMap";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import {
  QueryDataSource,
  QueryDataSourceId,
} from "@/models/queries/QueryDataSource/QueryDataSource.types";

type Props = {
  value?: QueryDataSource | null;
  defaultValue?: QueryDataSource | null;
  onChange?: (value: QueryDataSource | null) => void;
} & Omit<SelectProps<QueryDataSourceId>, "value" | "defaultValue" | "onChange">;

/**
 * A select component for selecting a data source, which can be
 * a dataset or an entity config.
 *
 * This component loads the list of datasets and entity configs on its own.
 * This component supports controlled and uncontrolled behavior and can be used
 * with `useForm`.
 */
export function QueryDataSourceSelect({
  defaultValue,
  value,
  onChange,
  ...selectProps
}: Props): JSX.Element {
  const [currentDataSource, setCurrentDataSource] =
    useUncontrolled<QueryDataSource | null>({
      value,
      defaultValue,
      finalValue: null,
      onChange,
    });

  const workspace = useCurrentWorkspace();
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [entityConfigs] = EntityConfigClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const dataSources: QueryDataSource[] = useMemo(() => {
    return [...(datasets ?? []), ...(entityConfigs ?? [])];
  }, [datasets, entityConfigs]);

  useOnBecomesDefined(
    dataSources,
    useCallback(
      (dsources) => {
        const firstDataSource = dsources[0];
        setCurrentDataSource(firstDataSource ?? null);
      },
      [setCurrentDataSource],
    ),
  );

  const dataSourceOptions: SelectData<QueryDataSourceId> = useMemo(() => {
    const datasetBucketsByType = makeBucketMap(datasets ?? [], {
      key: "sourceType",
    });

    // if there is only what dataset type and no entity configs, we
    // can just show a flat list
    if (
      datasetBucketsByType.size === 1 &&
      (!entityConfigs || entityConfigs.length === 0)
    ) {
      return makeSelectOptions(datasets ?? [], {
        valueKey: "id",
        labelKey: "name",
      });
    }

    // if we have more than 1 bucket that means we need to group things
    const groups: Array<SelectOptionGroup<QueryDataSourceId>> = [];
    datasetBucketsByType.forEach((bucketValues, bucketKey) => {
      const bucketName = match(bucketKey)
        .with("csv_file", () => {
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
            valueKey: "id",
            labelKey: "name",
          }),
        });
      }
    });
    return [
      ...groups,
      {
        group: "Profiles",
        items: makeSelectOptions(entityConfigs ?? [], {
          valueKey: "id",
          labelKey: "name",
        }),
      },
    ];
  }, [datasets, entityConfigs]);

  const onDataSourceChange = (newDataSourceId: QueryDataSourceId | null) => {
    const newDataSource =
      dataSources.find((ds) => {
        return ds.id === newDataSourceId;
      }) ?? null;
    setCurrentDataSource(newDataSource);
  };

  return (
    <Select
      data={dataSourceOptions}
      label="Data source"
      placeholder="Select a data source"
      value={currentDataSource?.id ?? null}
      onChange={onDataSourceChange}
      {...selectProps}
    />
  );
}
