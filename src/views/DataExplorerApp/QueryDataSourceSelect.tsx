import { makeSelectOptions, Select, Tooltip } from "@avandar/ui";
import { makeBucketMap, prop, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Group, Text } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { OfflineUnavailableTooltipLabel } from "@/components/offline/OfflineUnavailableTooltipLabel";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import type { SelectData, SelectOptionGroup, SelectProps } from "@avandar/ui";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  QueryDataSource,
  QueryDataSourceId,
} from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { UserId } from "$/models/User/User.types";

type Props = {
  value?: QueryDataSource | null;
  defaultValue?: QueryDataSource | null;
  onChange?: (value: QueryDataSource | null) => void;
} & Omit<SelectProps<QueryDataSourceId>, "value" | "defaultValue" | "onChange">;

/**
 * A select component for selecting a data source, which can be
 * a dataset or a concept.
 *
 * This component loads the list of datasets and concepts on its own.
 * This component supports controlled and uncontrolled behavior and can be used
 * with `useForm`.
 */
export function QueryDataSourceSelect({
  defaultValue,
  value,
  onChange,
  ...selectProps
}: Props): JSX.Element {
  const { t } = useLingui();
  const isControlled = value !== undefined;
  const [currentDataSource, setCurrentDataSource] =
    useUncontrolled<QueryDataSource | null>({
      value,
      defaultValue,
      finalValue: null,
      onChange,
    });

  const workspace = useCurrentWorkspace();
  const isOnline = useIsOnline();
  const [userProfile] = useCurrentUserProfile();
  // Dataset ids with parquet cached locally for the current user/workspace.
  const userId = userProfile?.userId;
  const [localDatasets = []] = LocalDatasetClient.useGetAll({
    where: {
      userId: { eq: userId as UserId },
      workspaceId: { eq: workspace.id },
    },
    useQueryOptions: { enabled: !!userId },
  });
  const localDatasetIds = useMemo(() => {
    return new Set(localDatasets.map(prop("datasetId")));
  }, [localDatasets]);
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [concepts] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const dataSources: QueryDataSource[] = useMemo(() => {
    return [...(datasets ?? []), ...(concepts ?? [])];
  }, [datasets, concepts]);

  useOnBecomesDefined(dataSources, (dsources) => {
    if (isControlled) {
      return;
    }

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
    return new Set(
      (datasets ?? [])
        .filter((dataset) => {
          return !localDatasetIds.has(dataset.id as Dataset.Id);
        })
        .map((dataset) => {
          return dataset.id as QueryDataSourceId;
        }),
    );
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
      (!concepts || concepts.length === 0)
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
        .with("csv_file", () => {
          return t`CSVs`;
        })
        .with("google_sheets", () => {
          return t`Google Sheets`;
        })
        .with("virtual", () => {
          return t`Derived Dataset`;
        })
        .with("open_data", () => {
          return t`Open Data`;
        })
        .with("xlsx_file", () => {
          return t`Excel files`;
        })
        .exhaustive(() => {
          return undefined;
        });
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
        group: t`Profiles`,
        items: makeSelectOptions(concepts ?? [], {
          valueKey: "id",
          labelKey: "name",
        }),
      },
    ];
  }, [datasets, concepts, unqueryableOfflineIds, t]);

  const onDataSourceChange = (newDataSourceId: QueryDataSourceId | null) => {
    const newDataSource =
      dataSources.find((ds) => {
        return ds.id === newDataSourceId;
      }) ?? null;
    setCurrentDataSource(newDataSource);
  };

  const hasDataSources = dataSources.length > 0;
  const { disabled: disabledProp, ...restSelectProps } = selectProps;

  return (
    <Select
      data={dataSourceOptions}
      label={t`Data source`}
      placeholder={t`Select a data source`}
      value={currentDataSource?.id ?? null}
      onChange={onDataSourceChange}
      disabled={disabledProp ?? !hasDataSources}
      renderOption={({ option }) => {
        return (
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">{option.label}</Text>
            {unqueryableOfflineIds.has(option.value as QueryDataSourceId) ?
              <Tooltip label={<OfflineUnavailableTooltipLabel />}>
                <Badge size="xs" color="red" variant="light">
                  <Trans>Not offline</Trans>
                </Badge>
              </Tooltip>
            : null}
          </Group>
        );
      }}
      {...restSelectProps}
    />
  );
}
