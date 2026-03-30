import type { ParsedURLState } from "@/views/DataExplorerApp/DataExplorerURLState";

type MinimalDataSource = { id: string };

/**
 * Returns true when the parsed URL carries at least one explorer key we may
 * hydrate (`ds`, `sql`, or `vc`). Used with `isDefaultExplorerState` to decide
 * first-mount hydration.
 */
export function urlSearchHasHydrateableExplorerKeys(
  parsed: ParsedURLState,
): boolean {
  return Boolean(parsed.dsId ?? parsed.rawSQL ?? parsed.vizConfig);
}

type DeferStructuredHydrationOptions = {
  urlState: ParsedURLState;
  restoredDataSource: MinimalDataSource | undefined;
  needsColumns: boolean;
  datasetColumns: readonly unknown[] | undefined;
  entityFieldConfigs: readonly unknown[] | undefined;
};

/**
 * When true, the hydration effect should return early and wait for datasets /
 * column metadata to load before applying structured URL state.
 */
export function shouldDeferURLHydrationForStructuredLoading(
  options: DeferStructuredHydrationOptions,
): boolean {
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
