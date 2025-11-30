import { MultiSelect, MultiSelectProps } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { where } from "$/lib/utils/filters/filters";
import { ReactNode, useEffect, useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { isNonNullish, isOfModelType } from "@/lib/utils/guards/guards";
import { makeIdLookupMap } from "@/lib/utils/maps/makeIdLookupMap";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { TypedId } from "@/models/Model";
import {
  QueryColumn,
  QueryColumnId,
  QueryColumns,
} from "@/models/queries/QueryColumn";
import { QueryDataSource } from "@/models/queries/QueryDataSource";

type Props = {
  label: ReactNode;
  placeholder: string;
  dataSourceId?: TypedId<QueryDataSource>;
  value?: readonly QueryColumn[];
  defaultValue?: readonly QueryColumn[];
  onChange?: (fields: readonly QueryColumn[]) => void;
} & Omit<MultiSelectProps, "value" | "defaultValue" | "onChange">;

export function QueryColumnMultiSelect({
  label,
  placeholder,
  dataSourceId,
  value,
  defaultValue,
  onChange,
  ...multiSelectProps
}: Props): JSX.Element {
  const [currentSelectedColumns, setCurrentSelectedColumns] = useUncontrolled<
    readonly QueryColumn[]
  >({
    value,
    defaultValue,
    onChange,
    finalValue: [],
  });

  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll({
      ...where("dataset_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: isOfModelType("Dataset", dataSourceId),
      },
    });

  const [entityFieldConfigs, isLoadingEntityFieldConfigs] =
    EntityFieldConfigClient.useGetAll({
      ...where("entity_config_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: isOfModelType("EntityConfig", dataSourceId),
      },
    });

  const isLoading = isLoadingDatasetColumns || isLoadingEntityFieldConfigs;

  const { selectableOptions, queryColumnLookup } = useMemo(() => {
    const queryColumns = [
      ...(datasetColumns ?? []).map((col) => {
        return QueryColumns.makeFromDatasetColumn(col);
      }),
      ...(entityFieldConfigs ?? []).map((col) => {
        return QueryColumns.makeFromEntityFieldConfig(col);
      }),
    ];

    return {
      selectableOptions: makeSelectOptions(queryColumns, {
        valueFn: prop("id"),
        labelFn: prop("baseColumn.name"),
      }),
      queryColumnLookup: makeIdLookupMap(queryColumns),
    };
  }, [datasetColumns, entityFieldConfigs]);

  // If the available columns change (e.g. if the `dataSourceId` changed)
  // we should drop any selections that are no longer valid.
  useEffect(() => {
    const prunedSelectedColumns = currentSelectedColumns.filter((col) => {
      return queryColumnLookup.has(col.id);
    });
    if (prunedSelectedColumns.length !== currentSelectedColumns.length) {
      setCurrentSelectedColumns(prunedSelectedColumns);
    }
  }, [queryColumnLookup, currentSelectedColumns, setCurrentSelectedColumns]);

  const selectedColumnIds = useMemo(() => {
    return currentSelectedColumns.map(prop("id"));
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
            return queryColumnLookup.get(columnId as QueryColumnId);
          })
          .filter(isNonNullish);
        setCurrentSelectedColumns(newSelectedColumns);
      }}
      nothingFoundMessage="No fields"
      {...multiSelectProps}
    />
  );
}
