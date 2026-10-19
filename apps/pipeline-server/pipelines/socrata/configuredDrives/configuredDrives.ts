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
 * Before adding a drive here, confirm its real total dataset count can be
 * fully enumerated in one run. `ava pipeline run socrata` paginates each
 * drive to exhaustion (100 datasets per page) but has no retry/backoff for
 * a rate limit, so a limit hit partway through drops that drive's entire
 * run rather than silently under-indexing it.
 */
export const CONFIGURED_DRIVES: readonly ConfiguredDrive[] = [
  {
    baseUrl: "https://data.cityofnewyork.us",
    organizationName: "City of New York",
  },
];
