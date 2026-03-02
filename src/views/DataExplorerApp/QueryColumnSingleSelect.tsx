import { useUncontrolled } from "@mantine/hooks";
import { where } from "$/lib/utils/filters/filters";
import { ReactNode, useEffect, useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { Select, SelectProps } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { isOfModelType } from "@/lib/utils/guards/guards";
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
  value?: QueryColumn | null;
  defaultValue?: QueryColumn | null;
  onChange?: (field: QueryColumn | null) => void;
} & Omit<SelectProps<QueryColumnId>, "value" | "defaultValue" | "onChange">;

export function QueryColumnSingleSelect({
  label,
  placeholder,
  dataSourceId,
  value,
  defaultValue,
  onChange,
  ...selectProps
}: Props): JSX.Element {
  const [currentSelectedColumn, setCurrentSelectedColumn] =
    useUncontrolled<QueryColumn | null>({
      value,
      defaultValue,
      onChange,
      finalValue: null,
    });

  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll({
      ...where("dataset_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: isOfModelType("Dataset", dataSourceId),
        usePreviousDataAsPlaceholder: true,
      },
    });

  const [entityFieldConfigs, isLoadingEntityFieldConfigs] =
    EntityFieldConfigClient.useGetAll({
      ...where("entity_config_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: isOfModelType("EntityConfig", dataSourceId),
        usePreviousDataAsPlaceholder: true,
      },
    });

  const isLoading = isLoadingDatasetColumns || isLoadingEntityFieldConfigs;

  const { selectableOptions, queryColumnLookup } = useMemo(() => {
    // TODO(jpsyx): this conversion to QueryColumns should happen in the clients
    // and there should be a global cache
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
  // we should drop the selection if it's no longer valid.
  useEffect(() => {
    const columns = [...queryColumnLookup.values()];
    const matchingColumn = columns.find((col) => {
      return col.baseColumn.id === currentSelectedColumn?.baseColumn.id;
    });

    setCurrentSelectedColumn(matchingColumn ?? null);
  }, [queryColumnLookup, currentSelectedColumn, setCurrentSelectedColumn]);

  const selectedColumnId = useMemo(() => {
    return currentSelectedColumn?.id ?? null;
  }, [currentSelectedColumn]);

  return (
    <Select
      searchable
      clearable
      label={label}
      placeholder={isLoading ? "Loading datasets..." : placeholder}
      data={selectableOptions}
      value={selectedColumnId}
      onChange={(newColumnId) => {
        // convert the column id back to column by looking it up
        const newSelectedColumn =
          newColumnId ?
            (queryColumnLookup.get(newColumnId as QueryColumnId) ?? null)
          : null;
        setCurrentSelectedColumn(newSelectedColumn);
      }}
      nothingFoundMessage="No fields"
      {...selectProps}
    />
  );
}
