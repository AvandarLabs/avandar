/**
 * One Socrata portal (drive) the metacatalog pipeline enumerates. No
 * `apiService` field: unlike the HDX pipeline's registry shape, every drive
 * here already speaks Socrata by construction, because Socrata genuinely is
 * one federated service with many portals underneath it - see
 * `connector-nomenclature.md`'s "One pipeline per service" section.
 */
export type ConfiguredDrive = {
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  /**
   * Used as every discovered dataset's `external_organization_name`.
   * Socrata's Discovery API has its own organization field, but it is not
   * reliable enough across every portal to parse automatically, so the
   * registry names it once per drive instead.
   */
  organizationName: string;
};

/**
 * The short, hardcoded list of Socrata portals this Avandar deployment
 * prebuilds a metacatalog for, each drive independently enabled by its
 * presence in this array. A fork maintains its own list; nothing here is
 * shared across deployments. See `open-data-catalog-architecture.md`
 * section 6.2.
 *
 * Each drive is crawled and resumed on its own, so adding one indexes it from
 * scratch on the next run without re-indexing the others. A drive must have
 * at most 10,000 assets, the most the Discovery API can page through; the
 * pipeline fails a larger drive with an error naming it.
 */
export const CONFIGURED_DRIVES: readonly ConfiguredDrive[] = [
  {
    baseUrl: "https://data.cityofnewyork.us",
    organizationName: "City of New York",
  },
];
