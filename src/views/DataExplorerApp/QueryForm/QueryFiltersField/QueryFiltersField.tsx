import { makeObject, prop } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Stack, Text } from "@mantine/core";
import { QueryBuilderMantine } from "@react-querybuilder/mantine";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { useCallback, useMemo } from "react";
import { QueryBuilder } from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";
import { FilterAddAction } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterAddAction/FilterAddAction";
import { FilterCombinatorSelector } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterCombinatorSelector/FilterCombinatorSelector";
import { FilterFieldSelector } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterFieldSelector/FilterFieldSelector";
import { FilterOperatorSelector } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterOperatorSelector/FilterOperatorSelector";
import { FilterRemoveAction } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterRemoveAction/FilterRemoveAction";
import { FilterValueEditorControl } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditorControl/FilterValueEditorControl";
import { useFilterTreeState } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState/useFilterTreeState";
import classes from "./QueryFiltersField.module.css";
import type { FilterControlsContext } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControlHelpers";
import type { LibraryGroup } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";
import type { QueryFilterColumnTypes } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { ReactNode } from "react";
import type { Field, RuleGroupType } from "react-querybuilder";

type Props = {
  /**
   * Every column of the current data source. Filters are not limited to the
   * columns the query displays: what you filter on and what you select are
   * separate choices.
   */
  columns: readonly QueryColumn.T[];
  /** The current filter tree. */
  value: StructuredQuery.FilterGroup;
  /** Called when the user edits the filter tree. */
  onChange: (nextFilterGroup: StructuredQuery.FilterGroup) => void;
};

/**
 * Recursive filter UI for the manual query form. Wraps `react-querybuilder`
 * with our own controls and holds the tree locally while the user edits, so
 * typing neither remounts the row nor runs a query per keystroke.
 */
export function QueryFiltersField({
  columns,
  value,
  onChange,
}: Props): ReactNode {
  const { t } = useLingui();

  // Every prop `QueryBuilder` receives is memoized: it fans them out to each
  // control, so a fresh literal per render re-renders the whole tree while the
  // user types.
  const combinators = useMemo(() => {
    return [
      { name: "AND", label: t`And` },
      { name: "OR", label: t`Or` },
    ];
  }, [t]);

  const translations = useMemo(() => {
    return {
      addRule: { label: t`+ Condition` },
      addGroup: { label: t`+ Group` },
    };
  }, [t]);

  const columnTypes: QueryFilterColumnTypes = useMemo(() => {
    return makeObject(columns, {
      keyFn: prop("baseColumn.name"),
      valueFn: prop("baseColumn.dataType"),
    });
  }, [columns]);

  const fields: Field[] = useMemo(() => {
    return columns.map((column) => {
      return {
        name: column.baseColumn.name,
        label: column.baseColumn.name,
      };
    });
  }, [columns]);

  const { query, matchCaseById, onQueryChange, commitNow, setMatchCase } =
    useFilterTreeState({ value, columnTypes, onChange });

  const getOperators = useCallback(
    (field: string) => {
      return QueryFilterOperator.getForDataType(columnTypes[field]).map(
        (operator) => {
          return { name: operator, label: operator };
        },
      );
    },
    [columnTypes],
  );

  const getDefaultOperator = useCallback(
    (field: string) => {
      return QueryFilterOperator.getDefaultForDataType(columnTypes[field]);
    },
    [columnTypes],
  );

  const context: FilterControlsContext = useMemo(() => {
    return { columnTypes, matchCaseById, setMatchCase, commitNow };
  }, [columnTypes, matchCaseById, setMatchCase, commitNow]);

  if (columns.length === 0) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="neutral.6">
          <Trans>Select a data source to add filters.</Trans>
        </Text>
      </Stack>
    );
  }

  return (
    <Box
      data-testid="query-filters-field"
      className={classes.queryFiltersField}
    >
      <QueryBuilderMantine>
        <QueryBuilder
          fields={fields}
          combinators={combinators}
          getOperators={getOperators}
          getDefaultOperator={getDefaultOperator}
          resetOnFieldChange={false}
          listsAsArrays
          showCombinatorsBetweenRules
          idGenerator={StructuredQuery.makeFilterNodeId}
          translations={translations}
          query={query as RuleGroupType}
          onQueryChange={(nextLibraryGroup) => {
            onQueryChange(nextLibraryGroup as LibraryGroup);
          }}
          context={context}
          controlElements={{
            fieldSelector: FilterFieldSelector,
            operatorSelector: FilterOperatorSelector,
            combinatorSelector: FilterCombinatorSelector,
            valueEditor: FilterValueEditorControl,
            addRuleAction: FilterAddAction,
            addGroupAction: FilterAddAction,
            removeRuleAction: FilterRemoveAction,
            removeGroupAction: FilterRemoveAction,
          }}
        />
      </QueryBuilderMantine>
    </Box>
  );
}
