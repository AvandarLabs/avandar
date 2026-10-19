import { Stack } from "@mantine/core";
import { AppliedFilterSummary } from "@/views/DataExplorerApp/AppliedFilterSummary/AppliedFilterSummary";
import { QueryFiltersField } from "../../QueryFiltersField/QueryFiltersField";
import { useManualQueryDataSourceChange } from "../../useManualQueryDataSourceChange";
import { AggregationFields } from "../AggregationFields";
import { LimitFields } from "../LimitFields/LimitFields";
import { OverwriteSqlAlert } from "../OverwriteSqlAlert/OverwriteSqlAlert";
import { SortFields } from "../SortFields";
import { SourceFields } from "../SourceFields";
import { ManualQueryFormLayout } from "./ManualQueryFormLayout";
import { useManualQueryFilterState } from "./useManualQueryFilterState";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ManualQueryFormHandlers } from "../ManualQueryForm";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { SourceColumnCatalog } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { ReactNode } from "react";

type Props = {
  sourceCatalog: SourceColumnCatalog;
  query: StructuredQuery.Partial;
  isStructuredQueryInSync: boolean;
  handlers: ManualQueryFormHandlers;
  withinPortal: boolean;
  layout: SettingsColumnsLayout;
};

/** Displays manual-query controls with source-aware filter reconciliation. */
export function ManualQueryFormView({
  query,
  sourceCatalog,
  isStructuredQueryInSync,
  handlers,
  withinPortal,
  layout,
}: Readonly<Props>): ReactNode {
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
    filters,
  } = query;
  const {
    onDataSourceChange,
    isLargeDatasetLimitHintVisible,
    dismissLargeDatasetLimitHint,
  } = useManualQueryDataSourceChange({ query, handlers });
  const {
    boundFilters,
    pendingFilters,
    onFiltersChange,
    onOverwrite,
    onDismiss,
  } = useManualQueryFilterState({
    filters,
    sourceCatalog,
    isStructuredQueryInSync,
    onSetFilters: handlers.onSetFilters,
  });
  const dataSourceColumns = sourceCatalog.columns;
  const overwriteAlert = pendingFilters ? (
    <OverwriteSqlAlert onOverwrite={onOverwrite} onDismiss={onDismiss} />
  ) : undefined;
  const sourceFields = (
    <SourceFields
      dataSource={dataSource}
      sourceCatalog={sourceCatalog}
      queryColumns={queryColumns}
      onDataSourceChange={onDataSourceChange}
      onSetColumns={(newColumns) => {
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

  return (
    <ManualQueryFormLayout
      layout={layout}
      hasQueryColumns={queryColumns.length > 0}
      overwriteAlert={overwriteAlert}
      sourceFields={sourceFields}
      aggregationFields={aggregationFields}
      filterFields={filterFields}
      sortFields={sortFields}
      limitFields={limitFields}
    />
  );
}
