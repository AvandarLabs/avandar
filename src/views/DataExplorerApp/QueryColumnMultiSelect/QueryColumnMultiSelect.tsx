import {
  defaultOptionsFilter,
  isOptionsGroup,
  MultiSelect,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { Model } from "@models/Model/Model";
import { makeSelectOptions } from "@ui/inputs/Select/makeSelectOptions";
import { where } from "@utils/filters/where/where";
import { isNonNullish } from "@utils/guards/isNonNullish/isNonNullish";
import { makeIdLookupMap } from "@utils/index";
import { prop } from "@utils/objects/hofs/prop/prop";
import { QueryColumns } from "$/models/queries/QueryColumn/QueryColumns";
import { matchSorter } from "match-sorter";
import { useEffect, useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { remapColumnsByBaseId } from "@/views/DataExplorerApp/QueryColumnMultiSelect/remapColumnsByBaseId";
import type {
  ComboboxItem,
  ComboboxParsedItem,
  MultiSelectProps,
  OptionsFilter,
} from "@mantine/core";
import type {
  QueryColumn,
  QueryColumnId,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { ReactNode } from "react";

/**
 * Maps combobox option values to items, including nested group items.
 */
function _optionByValueFromParsed(
  options: ComboboxParsedItem[],
): Map<string, ComboboxItem> {
  const entries = options.flatMap((item) => {
    if (isOptionsGroup(item)) {
      return item.items.map((subItem) => {
        return [subItem.value, subItem] as const;
      });
    }
    return [[item.value, item] as const];
  });
  return new Map(entries);
}

type Props = {
  label: ReactNode;
  placeholder: string;
  dataSourceId?: Model.TypedId<QueryDataSource>;
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
        enabled: Model.isOfModelType(dataSourceId, "Dataset"),
      },
    });

  const [entityFieldConfigs, isLoadingEntityFieldConfigs] =
    EntityFieldConfigClient.useGetAll({
      ...where("entity_config_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: Model.isOfModelType(dataSourceId, "EntityConfig"),
      },
    });

  const isLoading = isLoadingDatasetColumns || isLoadingEntityFieldConfigs;

  const { queryColumns, selectableOptions, queryColumnLookup } = useMemo(() => {
    const columns = [
      ...(datasetColumns ?? []).map((col) => {
        return QueryColumns.makeFromDatasetColumn(col);
      }),
      ...(entityFieldConfigs ?? []).map((col) => {
        return QueryColumns.makeFromEntityFieldConfig(col);
      }),
    ];

    return {
      queryColumns: columns,
      selectableOptions: makeSelectOptions(columns, {
        valueKey: "id",
        labelFn: prop("baseColumn.name"),
      }),
      queryColumnLookup: makeIdLookupMap(columns),
    };
  }, [datasetColumns, entityFieldConfigs]);

  const matchColumnFilter = useMemo((): OptionsFilter => {
    return ({ options, search, limit }) => {
      const trimmedSearch = search.trim();
      if (trimmedSearch === "") {
        return defaultOptionsFilter({ options, search, limit });
      }
      const optionByValue = _optionByValueFromParsed(options);
      const matchedColumns = matchSorter(queryColumns, trimmedSearch, {
        keys: [
          (column) => {
            return column.baseColumn.name;
          },
        ],
      });
      return matchedColumns
        .map((column) => {
          return optionByValue.get(column.id);
        })
        .filter(isNonNullish)
        .slice(0, limit);
    };
  }, [queryColumns]);

  // When available columns change (e.g. data source changed, or columns
  // were restored from URL with different synthetic UUIDs), remap the
  // current selection to the canonical instances from the available set.
  useEffect(() => {
    const remapped = remapColumnsByBaseId({
      selectedColumns: currentSelectedColumns,
      availableColumns: queryColumns,
    });
    if (remapped !== undefined) {
      setCurrentSelectedColumns(remapped);
    }
  }, [queryColumns, currentSelectedColumns, setCurrentSelectedColumns]);

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
      filter={matchColumnFilter}
    />
  );
}
