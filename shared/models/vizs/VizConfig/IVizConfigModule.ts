import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { AnyVizSettingDescriptors } from "$/models/vizs/SettingDescriptor.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

export interface IVizConfigModule<
  VType extends VizType,
  TVizConfig = VizConfigType<VType>,
> {
  readonly vizType: VType;

  /** The display name of the viz config type. Used for UI display purposes. */
  readonly displayName: string;

  /**
   * Descriptor registry for this viz's settings. Drives the
   * settings-form UI: the host's `chart` descriptors are always shown,
   * and each series's `series` descriptors are looked up from the
   * series's `renderAs` viz module (filtered by `composable` when
   * embedded across types).
   *
   * See the doc comment at the top of {@link SettingDescriptor} for
   * the "setting vs. control" nomenclature.
   */
  readonly descriptors: AnyVizSettingDescriptors;

  /** Create an empty config with no settings applied. */
  makeEmptyConfig(): TVizConfig;

  /**
   * Hydrate any empty values in the viz config from a given query, so we can
   * populate the viz config as much as possible.
   * @param vizConfig The viz config
   * @param query The query to hydrate values from
   * @returns The new viz config
   */
  hydrateFromQuery(
    vizConfig: TVizConfig,
    query: PartialStructuredQuery,
  ): TVizConfig;

  /**
   * Hydrate empty values from query result column metadata (names and types).
   * Fills only where structured query hydration is insufficient (see app
   * layer). Typically fills undefined axis keys only.
   * @param vizConfig The viz config
   * @param columns Columns returned with the query result
   * @returns The updated viz config
   */
  hydrateFromQueryResult(
    vizConfig: TVizConfig,
    columns: readonly QueryResultColumn[],
  ): TVizConfig;

  /**
   * Convert a viz config to a new type while keeping as many values from
   * the current config as possible.
   *
   * @param vizConfig The viz config
   * @param newVizType The viz type we are converting to
   * @returns The new viz config
   */
  convertVizConfig<K extends VizType>(
    vizConfig: TVizConfig,
    newVizType: K,
  ): VizConfigType<K>;
}
