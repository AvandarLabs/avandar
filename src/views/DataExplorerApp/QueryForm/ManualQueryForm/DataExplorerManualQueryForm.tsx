import { Model } from "@avandar/models";
import { useEffect, useMemo } from "react";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useQueryColumnsForDataSource } from "@/views/DataExplorerApp/useQueryColumnsForDataSource";
import { ManualQueryFormView } from "./ManualQueryFormView/ManualQueryFormView";
import type { ManualQueryFormHandlers } from "./ManualQueryForm";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { ReactNode } from "react";

type Props = { withinPortal: boolean; layout: SettingsColumnsLayout };

/**
 * Legacy wrapper that wires the form to the global Data Explorer state
 * manager. Kept so existing callers in the Data Explorer don't have to
 * thread state and handlers through props.
 */
export function DataExplorerManualQueryForm({
  withinPortal,
  layout,
}: Props): ReactNode {
  const [{ query, isStructuredQueryInSync, sourceCatalog }, dispatch] =
    DataExplorerStateManager.useContext();
  const sourceKey = useMemo(() => {
    return query.dataSource ? Model.getTypedId(query.dataSource) : undefined;
  }, [query.dataSource]);
  const loaded = useQueryColumnsForDataSource(sourceKey);
  useEffect(
    function synchronizeSourceCatalog() {
      dispatch.setSourceColumns({
        sourceKey,
        status: loaded.isReady ? "ready" : "loading",
        columns: loaded.columns,
      });
    },
    [dispatch, sourceKey, loaded.columns, loaded.isReady],
  );

  const handlers: ManualQueryFormHandlers = {
    onSetDataSource: (dataSource, options) => {
      dispatch.setDataSource({ dataSource, options });
    },
    onSetColumns: dispatch.setColumns,
    onSetColumnAggregation: dispatch.setColumnAggregation,
    onSetOrderByColumn: dispatch.setOrderByColumn,
    onSetOrderByDirection: dispatch.setOrderByDirection,
    onSetLimit: dispatch.setLimit,
    onSetFilters: ({ filters }) => {
      dispatch.setFilters(filters);
    },
  };

  return (
    <ManualQueryFormView
      query={query}
      sourceCatalog={
        sourceCatalog ?? { sourceKey, status: "loading", columns: [] }
      }
      isStructuredQueryInSync={isStructuredQueryInSync}
      handlers={handlers}
      withinPortal={withinPortal}
      layout={layout}
    />
  );
}
