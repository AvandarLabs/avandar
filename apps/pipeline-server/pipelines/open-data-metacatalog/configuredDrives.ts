/** One drive (CKAN deployment or Socrata portal) the metacatalog pipeline enumerates. */
export type ConfiguredDrive = {
  apiService: "ckan" | "socrata";
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  /**
   * Used as every discovered dataset's `external_organization_name`.
   * Neither client parses an organization field from its own API today
   * (CKAN's `package_show` has one, Socrata's Discovery API has a
   * different one, and the two are not alike enough to normalize), so the
   * registry names it once per drive instead.
   */
  organizationName: string;
};

/**
 * The short, hardcoded list of drives this Avandar deployment prebuilds a
 * metacatalog for. A fork maintains its own list; nothing here is shared
 * across deployments. See `open-data-catalog-architecture.md` section 6.2.
 */
export const CONFIGURED_DRIVES: readonly ConfiguredDrive[] = [
  {
    apiService: "ckan",
    baseUrl: "https://data.humdata.org",
    organizationName: "Humanitarian Data Exchange",
  },
];
