import { Model } from "@avandar/models";
import { makeSelectOptions } from "@avandar/ui";
import { isNonNullish, makeIdLookupMap, prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import {
  defaultOptionsFilter,
  isOptionsGroup,
  MultiSelect,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types";
import { matchSorter } from "match-sorter";
import { useMemo } from "react";
import { remapColumnsByBaseId } from "@/views/DataExplorerApp/QueryColumnMultiSelect/remapColumnsByBaseId/remapColumnsByBaseId";
import { useQueryColumnsForDataSource } from "@/views/DataExplorerApp/useQueryColumnsForDataSource";
import type {
  ComboboxItem,
  ComboboxParsedItem,
  MultiSelectProps,
  OptionsFilter,
} from "@mantine/core";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
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
  value?: readonly QueryColumn.T[];
  defaultValue?: readonly QueryColumn.T[];
  onChange?: (fields: readonly QueryColumn.T[]) => void;
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
  const { t } = useLingui();
  const [currentSelectedColumns, setCurrentSelectedColumns] = useUncontrolled<
    readonly QueryColumn.T[]
  >({
    value,
    defaultValue,
    onChange,
    finalValue: [],
  });

  // Column loading lives in a shared hook so this multi-select (what the query
  // selects) and the filter panel (what the query can filter on) always agree
  // about which columns exist.
  const { columns: queryColumns, isLoading } =
    useQueryColumnsForDataSource(dataSourceId);

  const { selectableOptions, queryColumnLookup } = useMemo(() => {
    return {
      selectableOptions: makeSelectOptions(queryColumns, {
        valueKey: "id",
        labelFn: prop("baseColumn.name"),
      }),
      queryColumnLookup: makeIdLookupMap(queryColumns),
    };
  }, [queryColumns]);

  const matchColumnFilter = useMemo((): OptionsFilter => {
    const filter: OptionsFilter = ({ options, search, limit }) => {
      const trimmedSearch = search.trim();
      if (trimmedSearch === "") {
        return defaultOptionsFilter({
          options,
          search,
          limit,
        }) as Array<ComboboxParsedItem<string>>;
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
        .slice(0, limit) as Array<ComboboxParsedItem<string>>;
    };
    return filter;
  }, [queryColumns]);

  const renderedSelectedColumns = useMemo(() => {
    return (
      remapColumnsByBaseId({
        selectedColumns: currentSelectedColumns,
        availableColumns: queryColumns,
      }) ?? currentSelectedColumns
    );
  }, [currentSelectedColumns, queryColumns]);

  const selectedColumnIds = useMemo(() => {
    return renderedSelectedColumns.map(prop("id"));
  }, [renderedSelectedColumns]);

  const hasSelectableColumns = selectableOptions.length > 0;
  const { disabled: disabledProp, ...restMultiSelectProps } = multiSelectProps;
  const isDisabled = disabledProp ?? (!isLoading && !hasSelectableColumns);

  return (
    <MultiSelect
      searchable
      clearable
      label={label}
      placeholder={isLoading ? t`Loading datasets...` : placeholder}
      data={selectableOptions}
      disabled={isDisabled}
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
      nothingFoundMessage={t`No fields`}
      {...restMultiSelectProps}
      filter={matchColumnFilter}
    />
  );
}
