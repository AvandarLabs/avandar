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
    status: incoming.isLoading ? "loading" : "ready",
    columns:
      sourceKey && !incoming.isLoading
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

/** Owns stable source wrappers for controls outside the Explorer provider. */
export function useSourceColumnCatalog(
  sourceKey: QueryDataSource.TypedId | undefined,
): SourceColumnCatalog {
  const incoming = useQueryColumnsForDataSource(sourceKey);
  const [previous, setPrevious] = useState<{
    incoming: ReturnType<typeof useQueryColumnsForDataSource>;
    catalog: SourceColumnCatalog;
  }>(() => {
    return {
      incoming,
      catalog: _createCatalog({ sourceKey, previous: undefined, incoming }),
    };
  });
  const isSameScope =
    sourceKey?.__type === previous.catalog.sourceKey?.__type &&
    sourceKey?.id === previous.catalog.sourceKey?.id;
  if (
    incoming.columns === previous.incoming.columns &&
    incoming.isLoading === previous.incoming.isLoading &&
    isSameScope
  ) {
    return previous.catalog;
  }
  const catalog = _createCatalog({
    sourceKey,
    previous: previous.catalog,
    incoming,
  });
  setPrevious({ incoming, catalog });
  return catalog;
}
