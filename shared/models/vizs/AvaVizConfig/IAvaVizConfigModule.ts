import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type {
  AvaVizConfigType,
  VizType,
} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";
import type { AnyVizSettingDescriptors } from "$/models/vizs/VizSettingDescriptors.types.ts";

export interface IAvaVizConfigModule<
  VType extends VizType,
  TVizConfig = AvaVizConfigType<VType>,
> {
  readonly vizType: VType;

  /**
   * The viz type's untranslated English name. User-facing text comes from
   * `vizTypeLabel` instead, which follows the active locale.
   */
  readonly displayName: string;

  /**
   * Descriptor registry for this viz's settings. Drives the
   * settings-form UI: the host's `chart` descriptors are always shown,
   * and each series's `series` descriptors are looked up from the
   * series's `renderAs` viz module (filtered by `composable` when
   * embedded across types).
   *
   * The "setting vs. control" nomenclature is defined in the comment at the
   * top of the file that declares {@link AnyVizSettingDescriptors}.
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
   * Fills the config's empty slots, such as an unset axis or an empty series
   * list, from a query result's columns. Set slots keep their column ID, even
   * when the result lacks that column.
   *
   * Use it so a chart has something to draw once a result arrives, for
   * example from raw SQL, where there is no structured query to seed from.
   * @param vizConfig The viz config
   * @param columns Columns returned with the query result
   * @returns The updated viz config
   */
  hydrateFromQueryResult(
    vizConfig: TVizConfig,
    columns: readonly QueryResult.ColumnWithId[],
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
  ): AvaVizConfigType<K>;
}
