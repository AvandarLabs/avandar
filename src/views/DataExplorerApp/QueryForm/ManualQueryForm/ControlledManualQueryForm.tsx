import { Model } from "@avandar/models";
import { QueryColumnReconciliation } from "$/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation";
import { ManualQueryFormView } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryFormView/ManualQueryFormView";
import { useSourceColumnCatalog } from "@/views/DataExplorerApp/useSourceColumnCatalog/useSourceColumnCatalog";
import type { ComponentProps, ReactNode } from "react";

type Props = Omit<ComponentProps<typeof ManualQueryFormView>, "sourceCatalog">;

/** Shares the controlled query's source identities across its form fields. */
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
