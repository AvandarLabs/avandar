import { useState } from "react";
import { QueryColumnReconciliation } from "$/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation";
import { useQueryColumnsForDataSource } from "@/views/DataExplorerApp/useQueryColumnsForDataSource";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { SourceColumnCatalog } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";

function _createCatalog(options: {
  sourceKey: QueryDataSource.TypedId | undefined;
  previous: SourceColumnCatalog | undefined;
  incoming: ReturnType<typeof useQueryColumnsForDataSource>;
}): SourceColumnCatalog {
  const { sourceKey, previous, incoming } = options;
  const isSameScope =
    sourceKey?.__type === previous?.sourceKey?.__type &&
    sourceKey?.id === previous?.sourceKey?.id;
  return {
    sourceKey,
    status: incoming.isReady ? "ready" : "loading",
    columns:
      sourceKey && incoming.isReady
        ? QueryColumnReconciliation.reconcileSourceColumns({
            sourceKey,
            previousSourceKey: previous?.sourceKey,
            previous: previous?.columns ?? [],
            incoming: incoming.columns,
          })
        : isSameScope
          ? (previous?.columns ?? [])
          : [],
  };
}

/**
 * Loads a data source's columns as a `SourceColumnCatalog`. Each column keeps
 * its ID when the same source reloads, and the same object comes back until
 * the source, its columns, or their status change. Use it in a control with no
 * Data Explorer state to hold the catalog, for example a column picker
 * outside the Data Explorer.
 */
export function useSourceColumnCatalog(
  sourceKey: Readonly<QueryDataSource.TypedId> | undefined,
): SourceColumnCatalog {
  const incoming = useQueryColumnsForDataSource(sourceKey);
  const [previousCatalogState, setPreviousCatalogState] = useState<{
    incoming: ReturnType<typeof useQueryColumnsForDataSource>;
    catalog: SourceColumnCatalog;
  }>(() => {
    return {
      incoming,
      catalog: _createCatalog({ sourceKey, previous: undefined, incoming }),
    };
  });
  const isSameScope =
    sourceKey?.__type === previousCatalogState.catalog.sourceKey?.__type &&
    sourceKey?.id === previousCatalogState.catalog.sourceKey?.id;
  if (
    incoming.columns === previousCatalogState.incoming.columns &&
    incoming.isLoading === previousCatalogState.incoming.isLoading &&
    incoming.isReady === previousCatalogState.incoming.isReady &&
    isSameScope
  ) {
    return previousCatalogState.catalog;
  }
  const catalog = _createCatalog({
    sourceKey,
    previous: previousCatalogState.catalog,
    incoming,
  });
  setPreviousCatalogState({ incoming, catalog });
  return catalog;
}
