import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Stack, Text } from "@mantine/core";
import { QueryBuilderMantine } from "@react-querybuilder/mantine";
import { makeQueryFilterNodeId } from "$/models/queries/StructuredQuery/QueryFilter.types";
import {
  defaultOperatorForDataType,
  operatorsForDataType,
} from "$/models/queries/StructuredQuery/QueryFilterOperator";
import { useMemo } from "react";
import { QueryBuilder } from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";
import {
  FilterAddAction,
  FilterCombinatorSelector,
  FilterFieldSelector,
  FilterOperatorSelector,
  FilterRemoveAction,
  FilterValueEditorControl,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControls";
import { useFilterTreeState } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState";
import classes from "./QueryFiltersField.module.css";
import type { FilterControlsContext } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControls";
import type { LibraryGroup } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { ReactNode } from "react";
import type { Field, RuleGroupType } from "react-querybuilder";

type Props = {
  /**
   * Every column of the current data source. Filters are not limited to the
   * columns the query displays: what you filter on and what you select are
   * separate choices.
   */
  columns: readonly QueryColumnRead[];
  /** The current filter tree. */
  value: QueryFilterGroup;
  /** Called when the user edits the filter tree. */
  onChange: (next: QueryFilterGroup) => void;
};

/**
 * Combinator options. The names are our own combinator values, so the select
 * always finds a matching option; the library's defaults are lower-case, which
 * is why this control used to render blank at every nesting level.
 */
const COMBINATORS = [
  { name: "AND", label: "And" },
  { name: "OR", label: "Or" },
];

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

  const columnTypes: Readonly<Record<string, AvaDataType.T>> = useMemo(() => {
    return Object.fromEntries(
      columns.map((column) => {
        return [column.baseColumn.name, column.baseColumn.dataType];
      }),
    );
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

  const context: FilterControlsContext = useMemo(() => {
    return {
      columnTypes,
      matchCaseById,
      setMatchCase,
      commitNow: () => {
        commitNow(query);
      },
    };
  }, [columnTypes, matchCaseById, setMatchCase, commitNow, query]);

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
          combinators={COMBINATORS}
          getOperators={(field) => {
            return operatorsForDataType(columnTypes[field]).map((operator) => {
              return { name: operator, label: operator };
            });
          }}
          getDefaultOperator={(field) => {
            return defaultOperatorForDataType(columnTypes[String(field)]);
          }}
          resetOnFieldChange={false}
          listsAsArrays
          showCombinatorsBetweenRules
          idGenerator={makeQueryFilterNodeId}
          translations={{
            addRule: { label: t`+ Condition` },
            addGroup: { label: t`+ Group` },
          }}
          query={query as RuleGroupType}
          onQueryChange={(next) => {
            onQueryChange(next as unknown as LibraryGroup);
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
