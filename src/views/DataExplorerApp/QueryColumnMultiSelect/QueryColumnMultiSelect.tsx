import { makeSelectOptions } from "@avandar/ui";
import { isNonNullish, makeIdLookupMap, prop, propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import {
  MultiSelect,
  defaultOptionsFilter,
  isOptionsGroup,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { matchSorter } from "match-sorter";
import { useMemo } from "react";
import { uuid } from "$/lib/uuid";
import { useSourceColumnCatalog } from "@/views/DataExplorerApp/useSourceColumnCatalog/useSourceColumnCatalog";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { SourceColumnCatalog } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type {
  ComboboxItem,
  ComboboxParsedItem,
  MultiSelectProps,
  OptionsFilter,
} from "@mantine/core";
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
  dataSourceId?: QueryDataSource.TypedId;
  sourceCatalog?: SourceColumnCatalog;
  value?: readonly QueryColumn.T[];
  defaultValue?: readonly QueryColumn.T[];
  onChange?: (fields: readonly QueryColumn.T[]) => void;
} & Omit<MultiSelectProps, "value" | "defaultValue" | "onChange">;

export function QueryColumnMultiSelect({
  label,
  placeholder,
  dataSourceId,
  sourceCatalog,
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

  const fallbackCatalog = useSourceColumnCatalog(
    sourceCatalog ? undefined : dataSourceId,
  );
  const catalog = sourceCatalog ?? fallbackCatalog;
  const isLoading = catalog.status === "loading";
  const queryColumns = useMemo(() => {
    const selectedColumns = currentSelectedColumns.flatMap((selected) => {
      const source = catalog.columns.find((column) => {
        return (
          column.baseColumn.__type === selected.baseColumn.__type &&
          column.baseColumn.id === selected.baseColumn.id
        );
      });
      return source ? [{ ...selected, baseColumn: source.baseColumn }] : [];
    });
    const unselectedSources = catalog.columns.filter((source) => {
      return !selectedColumns.some((selected) => {
        return (
          selected.baseColumn.__type === source.baseColumn.__type &&
          selected.baseColumn.id === source.baseColumn.id
        );
      });
    });
    return [...selectedColumns, ...unselectedSources];
  }, [currentSelectedColumns, catalog.columns]);

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

  const selectedColumnIds = useMemo(() => {
    return currentSelectedColumns
      .filter((column) => {
        return queryColumnLookup.has(column.id);
      })
      .map(prop("id"));
  }, [currentSelectedColumns, queryColumnLookup]);

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
            const column = queryColumnLookup.get(columnId as QueryColumn.Id);
            if (
              !column ||
              currentSelectedColumns.some(propEq("id", column.id))
            ) {
              return column;
            }
            return { ...column, id: uuid<QueryColumn.Id>() };
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
