import { useLingui } from "@lingui/react/macro";
import { useUncontrolled } from "@mantine/hooks";
import { makeSelectOptions, Select } from "@ui";
import { makeBucketMap, where } from "@utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import type { SelectData, SelectOptionGroup, SelectProps } from "@ui";
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
    if (isControlled) {
      return;
    }

    // if the current value is contained in the datasource list, then
    // we don't have to trigger any change
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
        group: t`Profiles`,
        items: makeSelectOptions(entityConfigs ?? [], {
          valueKey: "id",
          labelKey: "name",
        }),
      },
    ];
  }, [datasets, entityConfigs, t]);

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
      label={t`Data source`}
      placeholder={t`Select a data source`}
      value={currentDataSource?.id ?? null}
      onChange={onDataSourceChange}
      {...selectProps}
    />
  );
}
