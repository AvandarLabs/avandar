import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { useState } from "react";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import {
  AggregationFields,
  FilterFields,
  LimitFields,
  OverwriteSqlAlert,
  SortFields,
  SourceFields,
} from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryFields";
import { useManualQueryDataSourceChange } from "@/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange";
import classes from "./ManualQueryForm.module.css";
import type { SettingsColumnGroup } from "@/components/SettingsColumns/SettingsColumns";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type {
  OrderByDirection,
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types";
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
  onSetOrderByDirection: (direction: OrderByDirection | undefined) => void;
  onSetLimit: (limit: number | undefined) => void;
  onSetFilters: (filters: QueryFilterGroup) => void;
};

/**
 * How the form arranges its field groups. `stacked` is the vertical fieldset
 * layout used by the dashboard editor's narrow settings panel; `columns` lays
 * the groups out side by side for the Data Explorer drawer.
 */
export type ManualQueryFormLayout = "columns" | "stacked";

type ControlledProps = {
  /**
   * Controlled mode: when omitted, the form reads from the global
   * `DataExplorerStateManager` (legacy Data Explorer wiring).
   */
  query: PartialStructuredQuery;
  isStructuredQueryInSync: boolean;
  handlers: ManualQueryFormHandlers;
  withinPortal?: boolean;
  layout?: ManualQueryFormLayout;
};

type LegacyProps = {
  query?: undefined;
  isStructuredQueryInSync?: undefined;
  handlers?: undefined;
  withinPortal?: boolean;
  layout?: ManualQueryFormLayout;
};

type Props = ControlledProps | LegacyProps;

type PendingChange =
  | { kind: "filter"; nextFilter: QueryFilterGroup }
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
  layout: ManualQueryFormLayout;
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

function ManualQueryFormView({
  query,
  isStructuredQueryInSync,
  handlers,
  withinPortal,
  layout,
}: {
  query: PartialStructuredQuery;
  isStructuredQueryInSync: boolean;
  handlers: ManualQueryFormHandlers;
  withinPortal: boolean;
  layout: ManualQueryFormLayout;
}): ReactNode {
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

  const onFiltersChange = (nextFilters: QueryFilterGroup): void => {
    if (!isStructuredQueryInSync) {
      setPendingChange({ kind: "filter", nextFilter: nextFilters });
      return;
    }
    handlers.onSetFilters(nextFilters);
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
    <FilterFields
      queryColumns={queryColumns}
      filters={filters}
      onFiltersChange={onFiltersChange}
    />
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

  if (layout === "columns") {
    const groups: SettingsColumnGroup[] = [
      { id: "source", title: t`Source`, content: sourceFields },
      ...(queryColumns.length > 0 ?
        [
          {
            id: "aggregations",
            title: t`Aggregations`,
            content: aggregationFields,
          },
        ]
      : []),
      { id: "filters", title: t`Filters (Where)`, content: filterFields },
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
    ];

    return (
      <Stack gap={0}>
        {overwriteAlert}
        <SettingsColumns groups={groups} layout="columns" />
      </Stack>
    );
  }

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

        <Fieldset legend={t`Sort by`} className={classes.fieldsetTranslucent}>
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
}
