import { Badge, Group, Text } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { makeSelectOptions, Select, Tooltip } from "@ui";
import { makeBucketMap, where } from "@utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import { useIsOnline } from "@/lib/offline/useIsOnline";
import { useLocalDatasetIds } from "@/lib/offline/useLocalDatasetIds";
import type { SelectData, SelectOptionGroup, SelectProps } from "@ui";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type {
  QueryDataSource,
  QueryDataSourceId,
} from "$/models/queries/QueryDataSource/QueryDataSource.types";

type Props = {
  value?: QueryDataSource | null;
  defaultValue?: QueryDataSource | null;
  onChange?: (value: QueryDataSource | null) => void;
} & Omit<SelectProps<QueryDataSourceId>, "value" | "defaultValue" | "onChange">;

/**
 * A select component for selecting a data source, which can be
 * a dataset or an entity config.
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
  const isOnline = useIsOnline();
  const localDatasetIds = useLocalDatasetIds();
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [entityConfigs] = EntityConfigClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const dataSources: QueryDataSource[] = useMemo(() => {
    return [...(datasets ?? []), ...(entityConfigs ?? [])];
  }, [datasets, entityConfigs]);

  useOnBecomesDefined(dataSources, (dsources) => {
    if (
      dsources.some((ds) => {
        return ds.id === currentDataSource?.id;
      })
    ) {
      return;
    }

    const firstDataSource = dsources[0];
    setCurrentDataSource(firstDataSource ?? null);
  });

  const unqueryableOfflineIds = useMemo(() => {
    if (isOnline) {
      return new Set<QueryDataSourceId>();
    }
    const ids = new Set<QueryDataSourceId>();
    for (const dataset of datasets ?? []) {
      if (!localDatasetIds.has(dataset.id as DatasetId)) {
        ids.add(dataset.id as QueryDataSourceId);
      }
    }
    return ids;
  }, [datasets, isOnline, localDatasetIds]);

  const dataSourceOptions: SelectData<QueryDataSourceId> = useMemo(() => {
    const buildDatasetOptions = (
      bucketValues: Array<{ id: QueryDataSourceId; name: string }>,
    ) => {
      return bucketValues.map((dataset) => {
        const isUnqueryableOffline = unqueryableOfflineIds.has(dataset.id);
        return {
          value: dataset.id,
          label: dataset.name,
          disabled: isUnqueryableOffline,
        };
      });
    };

    const datasetBucketsByType = makeBucketMap(datasets ?? [], {
      key: "sourceType",
    });

    if (
      datasetBucketsByType.size === 1 &&
      (!entityConfigs || entityConfigs.length === 0)
    ) {
      return buildDatasetOptions(
        (datasets ?? []).map((dataset) => {
          return { id: dataset.id as QueryDataSourceId, name: dataset.name };
        }),
      );
    }

    const groups: Array<SelectOptionGroup<QueryDataSourceId>> = [];
    datasetBucketsByType.forEach((bucketValues, bucketKey) => {
      const bucketName = match(bucketKey)
        .with("csv_file", () => "CSVs")
        .with("google_sheets", () => "Google Sheets")
        .with("virtual", () => "Derived Dataset")
        .with("open_data", () => "Open Data")
        .with("xlsx_file", () => "Excel files")
        .exhaustive(() => undefined);
      if (bucketName) {
        groups.push({
          group: bucketName,
          items: buildDatasetOptions(
            bucketValues.map((dataset) => {
              return {
                id: dataset.id as QueryDataSourceId,
                name: dataset.name,
              };
            }),
          ),
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
  }, [datasets, entityConfigs, unqueryableOfflineIds]);

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
      renderOption={({ option }) => (
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm">{option.label}</Text>
          {unqueryableOfflineIds.has(option.value as QueryDataSourceId) ?
            <Tooltip label="Not available offline. Open this dataset while online to cache it.">
              <Badge size="xs" color="red" variant="light">
                Not offline
              </Badge>
            </Tooltip>
          : null}
        </Group>
      )}
      {...selectProps}
    />
  );
}
