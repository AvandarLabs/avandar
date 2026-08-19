import { Model } from "@avandar/models";
import { isDefined, matchLiteral, prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { pruneFilterColumns } from "$/models/queries/StructuredQuery/pruneFilterColumns/pruneFilterColumns";
import { useEffect, useMemo, useRef, useState } from "react";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { notifyWarning } from "@/utils/notifications/notify";
import { AppliedFilterSummary } from "@/views/DataExplorerApp/AppliedFilterSummary/AppliedFilterSummary";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { AggregationFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields";
import { LimitFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/LimitFields/LimitFields";
import { OverwriteSqlAlert } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/OverwriteSqlAlert/OverwriteSqlAlert";
import { SortFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/SortFields";
import { SourceFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/SourceFields";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import { useManualQueryDataSourceChange } from "@/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange";
import { useQueryColumnsForDataSource } from "@/views/DataExplorerApp/useQueryColumnsForDataSource";
import classes from "./ManualQueryForm.module.css";
import type {
  SettingsColumnGroup,
  SettingsColumnsLayout,
} from "@/components/SettingsColumns/SettingsColumns";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

/**
 * Callbacks invoked when the user changes the form. Mirrors the action set on
 * `DataExplorerStateManager` so both Data Explorer and dashboard editors can
 * drive this form. Implementations are expected to regenerate the raw SQL
 * (via `structuredQueryToSql`) and update sync metadata.
 */
export type ManualQuerySetDataSourceOptions = {
  /** Applied atomically with the data source so the first query is bounded. */
  limit?: number;
};

export type ManualQueryFormHandlers = {
  onSetDataSource: (
    dataSource: QueryDataSource | undefined,
    options?: ManualQuerySetDataSourceOptions,
  ) => void;
  onSetColumns: (columns: readonly QueryColumn.T[]) => void;
  onSetColumnAggregation: (payload: {
    columnId: QueryColumn.Id;
    aggregation: QueryAggregationType.T;
  }) => void;
  onSetOrderByColumn: (columnId: QueryColumnId | undefined) => void;
  onSetOrderByDirection: (
    direction: StructuredQuery.OrderByDirection | undefined,
  ) => void;
  onSetLimit: (limit: number | undefined) => void;
  onSetFilters: (filters: StructuredQuery.FilterGroup) => void;
};

type ControlledProps = {
  /**
   * Controlled mode: when omitted, the form reads from the global
   * `DataExplorerStateManager` (legacy Data Explorer wiring).
   */
  query: StructuredQuery.Partial;
  isStructuredQueryInSync: boolean;
  handlers: ManualQueryFormHandlers;
  withinPortal?: boolean;
  layout?: SettingsColumnsLayout;
};

type LegacyProps = {
  query?: undefined;
  isStructuredQueryInSync?: undefined;
  handlers?: undefined;
  withinPortal?: boolean;
  layout?: SettingsColumnsLayout;
};

type Props = ControlledProps | LegacyProps;

type PendingChange =
  | { kind: "filter"; nextFilter: StructuredQuery.FilterGroup }
  | undefined;

export function ManualQueryForm(props: Props): ReactNode {
  const { withinPortal = true, layout = "stacked" } = props;
  if (props.query !== undefined) {
    return (
      <ManualQueryFormView
        query={props.query}
        isStructuredQueryInSync={props.isStructuredQueryInSync}
        handlers={props.handlers}
        withinPortal={withinPortal}
        layout={layout}
      />
    );
  }
  return (
    <DataExplorerManualQueryForm withinPortal={withinPortal} layout={layout} />
  );
}

/**
 * Legacy wrapper that wires the form to the global Data Explorer state
 * manager. Kept so existing callers in the Data Explorer don't have to
 * thread state and handlers through props.
 */
function DataExplorerManualQueryForm({
  withinPortal,
  layout,
}: {
  withinPortal: boolean;
  layout: SettingsColumnsLayout;
}): ReactNode {
  const [{ query, isStructuredQueryInSync }, dispatch] =
    DataExplorerStateManager.useContext();

  const handlers: ManualQueryFormHandlers = {
    onSetDataSource: (dataSource, options) => {
      dispatch.setDataSource({ dataSource, options });
    },
    onSetColumns: dispatch.setColumns,
    onSetColumnAggregation: dispatch.setColumnAggregation,
    onSetOrderByColumn: dispatch.setOrderByColumn,
    onSetOrderByDirection: dispatch.setOrderByDirection,
    onSetLimit: dispatch.setLimit,
    onSetFilters: dispatch.setFilters,
  };

  return (
    <ManualQueryFormView
      query={query}
      isStructuredQueryInSync={isStructuredQueryInSync}
      handlers={handlers}
      withinPortal={withinPortal}
      layout={layout}
    />
  );
}

type ViewProps = {
  query: StructuredQuery.Partial;
  isStructuredQueryInSync: boolean;
  handlers: ManualQueryFormHandlers;
  withinPortal: boolean;
  layout: SettingsColumnsLayout;
};

function ManualQueryFormView({
  query,
  isStructuredQueryInSync,
  handlers,
  withinPortal,
  layout,
}: ViewProps): ReactNode {
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
  const { columns: dataSourceColumns } = useQueryColumnsForDataSource(
    dataSource ? Model.getTypedId(dataSource) : undefined,
  );

  const dataSourceColumnNames = useMemo(() => {
    return dataSourceColumns.map(prop("baseColumn.name"));
  }, [dataSourceColumns]);

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
      const result =
        dataSourceColumnNames.length > 0 && isStructuredQueryInSync ?
          pruneFilterColumns({
            filters,
            availableColumnNames: dataSourceColumnNames,
          })
        : undefined;
      const removedColumnNames = result?.removedColumnNames.join(", ") ?? "";
      if (
        result !== undefined &&
        removedColumnNames !== "" &&
        removedColumnNames !== prunedColumnsRef.current
      ) {
        prunedColumnsRef.current = removedColumnNames;
        // Reported as a notification rather than held in local state: the
        // removal is a one-off event, and a toast outlives the render that
        // triggered it without duplicating the filter tree's state here.
        // Running these rules would fail the whole query with a binder error,
        // since the new data source has no such columns.
        onSetFiltersRef.current(result.filters);
        notifyWarning({
          title: t`Some filters were removed`,
          message: t`They referenced columns this data source does not have: ${removedColumnNames}`,
        });
      }
    },
    [dataSourceColumnNames, filters, isStructuredQueryInSync, t],
  );

  const onFiltersChange = (nextFilters: StructuredQuery.FilterGroup): void => {
    if (isStructuredQueryInSync) {
      handlers.onSetFilters(nextFilters);
    } else {
      setPendingChange({ kind: "filter", nextFilter: nextFilters });
    }
  };

  const overwriteAlert =
    pendingChange ?
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
    : null;

  const sourceFields = (
    <SourceFields
      dataSource={dataSource}
      queryColumns={queryColumns}
      onDataSourceChange={onDataSourceChange}
      onSetColumns={(newColumns: readonly QueryColumnRead[]) => {
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
      <AppliedFilterSummary filters={filters} />
      <QueryFiltersField
        columns={dataSourceColumns}
        value={filters}
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
    queryColumns.length > 0 ?
      {
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

            {queryColumns.length > 0 ?
              <Fieldset
                legend={t`Aggregations`}
                className={classes.fieldsetTranslucent}
              >
                {aggregationFields}
              </Fieldset>
            : null}

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
