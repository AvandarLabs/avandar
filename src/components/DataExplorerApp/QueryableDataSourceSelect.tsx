import { useUncontrolled } from "@mantine/hooks";
import { useCallback, useMemo } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import { Select, SelectOptionGroup, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { where } from "@/lib/utils/filters/filterBuilders";
import { makeBucketMap } from "@/lib/utils/maps/builders";
import { Dataset, DatasetId } from "@/models/datasets/Dataset";
import { EntityConfig, EntityConfigId } from "@/models/EntityConfig";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";

export type QueryableDataSourceIdWithType =
  | {
      type: "Dataset";
      id: DatasetId;
    }
  | {
      type: "EntityConfig";
      id: EntityConfigId;
    };

export type QueryableDataSourceId = QueryableDataSourceIdWithType["id"];

export type QueryableDataSource =
  | {
      type: "Dataset";
      object: Dataset;
    }
  | {
      type: "EntityConfig";
      object: EntityConfig;
    };

type Props = {
  value?: QueryableDataSource | null;
  defaultValue?: QueryableDataSource | null;
  onChange?: (value: QueryableDataSource | null) => void;
} & Omit<
  SelectProps<QueryableDataSourceId>,
  "value" | "defaultValue" | "onChange"
>;

/**
 * A select component for selecting a data source, which can be
 * a dataset or an entity config.
 *
 * This component loads the list of datasets and entity configs on its own.
 * This component supports controlled and uncontrolled behavior and can be used
 * with `useForm`.
 */
export function QueryableDataSourceSelect({
  defaultValue,
  value,
  onChange,
  ...selectProps
}: Props): JSX.Element {
  const [currentDataSource, setCurrentDataSource] =
    useUncontrolled<QueryableDataSource | null>({
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
  const dataSources: QueryableDataSource[] = useMemo(() => {
    return [
      ...(datasets ?? []).map((d) => {
        return { type: "Dataset" as const, object: d };
      }),
      ...(entityConfigs ?? []).map((ec) => {
        return { type: "EntityConfig" as const, object: ec };
      }),
    ];
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

  const dataSourceOptions = useMemo(() => {
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
    const groups: Array<SelectOptionGroup<QueryableDataSourceId>> = [];
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

  const onDataSourceChange = (
    newDataSourceId: QueryableDataSourceId | null,
  ) => {
    const newDataSource =
      dataSources.find((ds) => {
        return ds.object.id === newDataSourceId;
      }) ?? null;
    setCurrentDataSource(newDataSource);
  };

  return (
    <Select
      data={dataSourceOptions}
      label="Data source"
      placeholder="Select a data source"
      value={currentDataSource?.object.id ?? null}
      onChange={onDataSourceChange}
      {...selectProps}
    />
  );
}
