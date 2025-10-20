import { PartialStructuredQuery } from "@/models/queries/StructuredQuery";
import { VizConfigType, VizType } from "./VizConfig.types";

export interface IVizConfigModule<
  VType extends VizType,
  TVizConfig = VizConfigType<VType>,
> {
  readonly vizType: VType;

  /** The display name of the viz config type. Used for UI display purposes. */
  readonly displayName: string;

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
