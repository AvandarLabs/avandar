import { isDefined, matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeQueryFilters } from "$/models/queries/StructuredQuery/normalizeQueryFilters/normalizeQueryFilters";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { notifyWarning } from "@/utils/notifications/notify";
import { AppliedFilterSummary } from "@/views/DataExplorerApp/AppliedFilterSummary/AppliedFilterSummary";
import { AggregationFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields";
import { LimitFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/LimitFields/LimitFields";
import { OverwriteSqlAlert } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/OverwriteSqlAlert/OverwriteSqlAlert";
import { SortFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/SortFields";
import { SourceFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/SourceFields";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import { useManualQueryDataSourceChange } from "@/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange";
import classes from "./ManualQueryForm.module.css";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ManualQueryFormHandlers } from "./ManualQueryForm";
import type {
  SettingsColumnGroup,
  SettingsColumnsLayout,
} from "@/components/SettingsColumns/SettingsColumns";
import type { SourceColumnCatalog } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { ReactNode } from "react";
type PendingChange =
  | { kind: "filter"; nextFilter: StructuredQuery.FilterGroup }
  | undefined;

type Props = {
  sourceCatalog: SourceColumnCatalog;
  query: StructuredQuery.Partial;
  isStructuredQueryInSync: boolean;
  handlers: ManualQueryFormHandlers;
  withinPortal: boolean;
  layout: SettingsColumnsLayout;
};

export function ManualQueryFormView({
  query,
  sourceCatalog,
  isStructuredQueryInSync,
  handlers,
  withinPortal,
  layout,
}: Props): ReactNode {
  const { t } = useLingui();
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
    filters,
  } = query;

  const [pendingChange, setPendingChange] = useState<PendingChange>(undefined);
  const {
    onDataSourceChange,
    isLargeDatasetLimitHintVisible,
    dismissLargeDatasetLimitHint,
  } = useManualQueryDataSourceChange({ query, handlers });

  // Filters address any column of the data source, not only the ones the query
  // displays: what you filter on and what you select are separate choices.
  const dataSourceColumns = sourceCatalog.columns;

  const normalized = useMemo(() => {
    return sourceCatalog.status === "ready"
      ? normalizeQueryFilters({
          filter: filters,
          columns: dataSourceColumns,
          clause: "where",
        })
      : undefined;
  }, [filters, dataSourceColumns, sourceCatalog.status]);
  const boundFilters = normalized?.filter ?? filters;

  // Held in a ref so the prune effect can depend on the columns it actually
  // watches. `handlers` is a fresh object literal on every render in both
  // hosts, so listing it in the dependency array would re-run the effect on
  // every render.
  const onSetFiltersRef = useRef(handlers.onSetFilters);
  useEffect(function trackLatestSetFilters() {
    onSetFiltersRef.current = handlers.onSetFilters;
  });

  // The set of columns the last prune reported, so a host that does not apply
  // `onSetFilters` is not warned about the same removal twice.
  const prunedColumnsRef = useRef<string | undefined>(undefined);

  useEffect(
    function pruneFiltersWhenColumnsChange() {
      // Nothing to prune against until the data source's columns have loaded.
      // Pruning is also skipped while the SQL is out of sync: the structured
      // query is not what runs then, and applying a prune regenerates the SQL
      // from it, which would discard hand-written SQL the form cannot
      // represent. That is the same overwrite `onFiltersChange` stops to
      // confirm, so it must not happen automatically.
      const result = isStructuredQueryInSync ? normalized : undefined;
      const issueKey = JSON.stringify(result?.issues ?? []);
      const hasChanged =
        result && JSON.stringify(result.filter) !== JSON.stringify(filters);
      if (hasChanged) {
        onSetFiltersRef.current(result.filter, dataSourceColumns);
      }
      if (
        result !== undefined &&
        issueKey !== "[]" &&
        issueKey !== prunedColumnsRef.current
      ) {
        prunedColumnsRef.current = issueKey;
        // Reported as a notification rather than held in local state: the
        // removal is a one-off event, and a toast outlives the render that
        // triggered it without duplicating the filter tree's state here.
        // Running these rules would fail the whole query with a binder error,
        // since the new data source has no such columns.
        notifyWarning({
          title: t`Some filters were removed`,
          message: t`They referenced columns this data source does not have.`,
        });
      }
    },
    [normalized, dataSourceColumns, filters, isStructuredQueryInSync, t],
  );

  const onFiltersChange = (nextFilters: StructuredQuery.FilterGroup): void => {
    if (isStructuredQueryInSync) {
      handlers.onSetFilters(nextFilters);
    } else {
      setPendingChange({ kind: "filter", nextFilter: nextFilters });
    }
  };

  const overwriteAlert = pendingChange ? (
    <OverwriteSqlAlert
      onOverwrite={() => {
        if (pendingChange.kind === "filter") {
          handlers.onSetFilters(pendingChange.nextFilter);
        }
        setPendingChange(undefined);
      }}
      onDismiss={() => {
        setPendingChange(undefined);
      }}
    />
  ) : null;

  const sourceFields = (
    <SourceFields
      dataSource={dataSource}
      sourceCatalog={sourceCatalog}
      queryColumns={queryColumns}
      onDataSourceChange={onDataSourceChange}
      onSetColumns={(newColumns: readonly QueryColumn.T[]) => {
        handlers.onSetColumns(newColumns);
      }}
      withinPortal={withinPortal}
    />
  );

  const aggregationFields = (
    <AggregationFields
      queryColumns={queryColumns}
      aggregations={aggregations}
      onSetColumnAggregation={handlers.onSetColumnAggregation}
      withinPortal={withinPortal}
    />
  );

  const filterFields = (
    <Stack gap="xs">
      <AppliedFilterSummary filters={boundFilters} />
      <QueryFiltersField
        columns={dataSourceColumns}
        value={boundFilters}
        onChange={onFiltersChange}
      />
    </Stack>
  );

  const sortFields = (
    <SortFields
      queryColumns={queryColumns}
      orderByColumn={orderByColumn}
      orderByDirection={orderByDirection}
      onSetOrderByColumn={handlers.onSetOrderByColumn}
      onSetOrderByDirection={handlers.onSetOrderByDirection}
      withinPortal={withinPortal}
    />
  );

  const limitFields = (
    <LimitFields
      query={query}
      onSetLimit={handlers.onSetLimit}
      isLargeDatasetLimitHintVisible={isLargeDatasetLimitHintVisible}
      dismissLargeDatasetLimitHint={dismissLargeDatasetLimitHint}
    />
  );

  const groups: SettingsColumnGroup[] = [
    { id: "source", title: t`Source`, content: sourceFields },
    queryColumns.length > 0
      ? {
          id: "aggregations",
          title: t`Aggregations`,
          content: aggregationFields,
        }
      : undefined,
    {
      id: "filters",
      title: t`Filters (Where)`,
      content: filterFields,
      span: 2,
    },
    {
      id: "sort-limit",
      title: t`Sort & limit`,
      content: (
        <>
          {sortFields}
          {limitFields}
        </>
      ),
    },
  ].filter(isDefined);

  return matchLiteral(layout, {
    columns: () => {
      return (
        <Stack gap={0}>
          {overwriteAlert}
          <SettingsColumns groups={groups} layout="columns" />
        </Stack>
      );
    },
    stacked: () => {
      return (
        <div>
          <Stack px="sm">
            {overwriteAlert}
            {sourceFields}

            {queryColumns.length > 0 ? (
              <Fieldset
                legend={t`Aggregations`}
                className={classes.fieldsetTranslucent}
              >
                {aggregationFields}
              </Fieldset>
            ) : null}

            <Fieldset
              legend={t`Filters (Where)`}
              className={classes.fieldsetTranslucent}
            >
              {filterFields}
            </Fieldset>

            <Fieldset
              legend={t`Sort by`}
              className={classes.fieldsetTranslucent}
            >
              {sortFields}
            </Fieldset>

            <Fieldset
              legend={t`Result size`}
              className={classes.fieldsetTranslucent}
            >
              {limitFields}
            </Fieldset>
          </Stack>
        </div>
      );
    },
  });
}
