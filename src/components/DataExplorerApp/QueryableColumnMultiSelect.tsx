import { MultiSelect } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { ReactNode, useEffect, useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNonNullish } from "@/lib/utils/guards";
import { makeIdLookupMap } from "@/lib/utils/maps/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import {
  DatasetColumn,
  DatasetColumnId,
} from "@/models/datasets/DatasetColumn";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import { QueryableDataSourceIdWithType } from "./QueryableDataSourceSelect";

export type QueryableColumnIdWithType =
  | {
      type: "DatasetColumn";
      id: DatasetColumnId;
    }
  | {
      type: "EntityFieldConfig";
      id: EntityFieldConfigId;
    };
export type QueryableColumnId = DatasetColumnId | EntityFieldConfigId;
export type QueryableColumn =
  | { type: "DatasetColumn"; value: DatasetColumn }
  | { type: "EntityFieldConfig"; value: EntityFieldConfig };

type Props = {
  label: ReactNode;
  placeholder: string;
  dataSourceId?: QueryableDataSourceIdWithType;
  value?: readonly QueryableColumn[];
  defaultValue?: readonly QueryableColumn[];
  onChange?: (fields: readonly QueryableColumn[]) => void;
};

// Human readable names for fields
// TODO(jpsyx): excluding these additional field names just for now
/*
const FIELD_NAME_OVERRIDES: Record<string, string> = {
  assignedTo: "Assigned to",
  status: "Status",
  createdAt: "Created at",
  updatedAt: "Updated at",
};
*/

export function QueryableColumnMultiSelect({
  label,
  placeholder,
  dataSourceId,
  value,
  defaultValue,
  onChange,
}: Props): JSX.Element {
  const [currentSelectedColumns, setCurrentSelectedColumns] = useUncontrolled<
    readonly QueryableColumn[]
  >({
    value,
    defaultValue,
    onChange,
    finalValue: [],
  });

  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll({
      ...where(
        "dataset_id",
        "eq",
        dataSourceId?.type === "Dataset" ? dataSourceId.id : undefined,
      ),
      useQueryOptions: {
        enabled: dataSourceId?.type === "Dataset",
      },
    });

  const [entityFieldConfigs, isLoadingEntityFieldConfigs] =
    EntityFieldConfigClient.useGetAll({
      ...where(
        "entity_config_id",
        "eq",
        dataSourceId?.type === "EntityConfig" ? dataSourceId.id : undefined,
      ),
      useQueryOptions: {
        enabled: dataSourceId?.type === "EntityConfig",
      },
    });

  const isLoading = isLoadingDatasetColumns || isLoadingEntityFieldConfigs;

  const { selectableOptions, queryableColumnLookup } = useMemo(() => {
    const combinedColumns = [
      ...(datasetColumns ?? []).map((col) => {
        return {
          type: "DatasetColumn" as const,
          value: col,
        };
      }),
      ...(entityFieldConfigs ?? []).map((col) => {
        return {
          type: "EntityFieldConfig" as const,
          value: col,
        };
      }),
    ];

    return {
      selectableOptions: makeSelectOptions(combinedColumns, {
        valueFn: getProp("value.id"),
        labelFn: getProp("value.name"),
      }),
      queryableColumnLookup: makeIdLookupMap(combinedColumns, {
        key: "value.id",
      }),
    };
  }, [datasetColumns, entityFieldConfigs]);

  // If the available columns change (e.g. if the `dataSourceId` changed)
  // we should drop any selections that are no longer valid.
  useEffect(() => {
    const prunedSelectedColumns = currentSelectedColumns.filter((col) => {
      return queryableColumnLookup.has(col.value.id);
    });
    if (prunedSelectedColumns.length !== currentSelectedColumns.length) {
      setCurrentSelectedColumns(prunedSelectedColumns);
    }
  }, [
    queryableColumnLookup,
    currentSelectedColumns,
    setCurrentSelectedColumns,
  ]);

  const selectedColumnIds = useMemo(() => {
    return currentSelectedColumns.map(getProp("value.id"));
  }, [currentSelectedColumns]);

  return (
    <MultiSelect
      searchable
      clearable
      label={label}
      placeholder={isLoading ? "Loading datasets..." : placeholder}
      data={selectableOptions}
      value={selectedColumnIds}
      onChange={(newColumnIds) => {
        // convert the column ids back to columns by looking them up
        const newSelectedColumns = newColumnIds
          .map((columnId) => {
            return queryableColumnLookup.get(columnId as QueryableColumnId);
          })
          .filter(isNonNullish);
        setCurrentSelectedColumns(newSelectedColumns);
      }}
      nothingFoundMessage="No fields"
    />
  );
}
