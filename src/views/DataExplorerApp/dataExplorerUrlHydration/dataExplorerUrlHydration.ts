import type { ParsedUrlState } from "@/views/DataExplorerApp/DataExplorerUrlState";

type MinimalDataSource = { id: string };

/**
 * Returns true when the parsed URL carries at least one explorer key we may
 * hydrate (`ds`, `sql`, or `vc`). Used with `isDefaultExplorerState` to decide
 * first-mount hydration.
 */
export function urlSearchHasHydrateableExplorerKeys(
  parsed: ParsedUrlState,
): boolean {
  return Boolean(parsed.dsId ?? parsed.rawSql ?? parsed.vizConfig);
}

type DeferStructuredHydrationOptions = {
  urlState: ParsedUrlState;
  restoredDataSource: MinimalDataSource | undefined;
  needsColumns: boolean;
  datasetColumns: readonly unknown[] | undefined;
  conceptAttributes: readonly unknown[] | undefined;
  /** Workspace datasets and columns loaded (needed to parse `?sql=`). */
  sqlMappingMetadataLoaded: boolean;
};

/**
 * When true, the hydration effect should return early and wait for datasets /
 * column metadata to load before applying structured URL state.
 */
export function shouldDeferUrlHydrationForStructuredLoading(
  options: DeferStructuredHydrationOptions,
): boolean {
  if (options.urlState.rawSql && !options.sqlMappingMetadataLoaded) {
    return true;
  }

  const restoreStructured = !options.urlState.rawSql;
  if (
    restoreStructured &&
    options.urlState.dsId &&
    !options.restoredDataSource
  ) {
    return true;
  }
  if (
    restoreStructured &&
    options.needsColumns &&
    !options.datasetColumns &&
    !options.conceptAttributes
  ) {
    return true;
  }
  return false;
}
