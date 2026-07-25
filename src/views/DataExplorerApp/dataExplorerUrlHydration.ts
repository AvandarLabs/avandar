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
  return Boolean(parsed.dsId ?? parsed.rawSQL ?? parsed.vizConfig);
}

type DeferStructuredHydrationOptions = {
  urlState: ParsedUrlState;
  restoredDataSource: MinimalDataSource | undefined;
  needsColumns: boolean;
  datasetColumns: readonly unknown[] | undefined;
  entityFieldConfigs: readonly unknown[] | undefined;
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
  if (options.urlState.rawSQL && !options.sqlMappingMetadataLoaded) {
    return true;
  }

  const restoreStructured = !options.urlState.rawSQL;
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
    !options.entityFieldConfigs
  ) {
    return true;
  }
  return false;
}
