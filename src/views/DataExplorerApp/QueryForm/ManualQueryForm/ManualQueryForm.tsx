import { ControlledManualQueryForm } from "./ControlledManualQueryForm";
import { DataExplorerManualQueryForm } from "./DataExplorerManualQueryForm";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
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
    dataSource: QueryDataSource.T | undefined,
    options?: ManualQuerySetDataSourceOptions,
  ) => void;
  onSetColumns: (columns: readonly QueryColumn.T[]) => void;
  onSetColumnAggregation: (payload: {
    columnId: QueryColumn.Id;
    aggregation: QueryAggregationType.T;
  }) => void;
  onSetOrderByColumn: (columnId: QueryColumn.Id | undefined) => void;
  onSetOrderByDirection: (
    direction: StructuredQuery.OrderByDirection | undefined,
  ) => void;
  onSetLimit: (limit: number | undefined) => void;
  onSetFilters: ({
    filters,
    sourceColumns,
  }: Readonly<{
    filters: StructuredQuery.FilterGroup;
    sourceColumns?: readonly QueryColumn.T[];
  }>) => void;
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

export function ManualQueryForm(props: Props): ReactNode {
  const { withinPortal = true, layout = "stacked" } = props;
  if (props.query !== undefined) {
    return (
      <ControlledManualQueryForm
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
