import { Model } from "@avandar/models";
import { QueryColumnReconciliation } from "$/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation";
import { ManualQueryFormView } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryFormView/ManualQueryFormView";
import { useSourceColumnCatalog } from "@/views/DataExplorerApp/useSourceColumnCatalog/useSourceColumnCatalog";
import type { ComponentProps, ReactNode } from "react";

type Props = Omit<ComponentProps<typeof ManualQueryFormView>, "sourceCatalog">;

/**
 * Renders the manual query form for a query its caller owns. It loads the
 * source's columns itself, keeps the column IDs already on
 * `query.sourceColumns`, and passes those columns along with each filter
 * edit. Rendered only by `ManualQueryForm`, when it is given a `query`.
 */
export function ControlledManualQueryForm({
  query,
  handlers,
  ...props
}: Props): ReactNode {
  const sourceKey = query.dataSource
    ? Model.getTypedId(query.dataSource)
    : undefined;
  const loaded = useSourceColumnCatalog(sourceKey);
  const columns =
    sourceKey && query.sourceColumns && loaded.status === "ready"
      ? QueryColumnReconciliation.reconcileSourceColumns({
          sourceKey,
          previousSourceKey: sourceKey,
          previous: query.sourceColumns,
          incoming: loaded.columns,
        })
      : loaded.columns;
  return (
    <ManualQueryFormView
      {...props}
      query={{
        ...query,
        sourceColumns:
          loaded.status === "ready" ? columns : query.sourceColumns,
      }}
      sourceCatalog={{ ...loaded, columns }}
      handlers={{
        ...handlers,
        onSetFilters: ({ filters }) => {
          return handlers.onSetFilters({
            filters: filters,
            sourceColumns: columns,
          });
        },
      }}
    />
  );
}
