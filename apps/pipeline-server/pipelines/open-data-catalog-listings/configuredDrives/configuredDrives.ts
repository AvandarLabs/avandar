import type { OpenDataCatalogListing } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing";

/**
 * One drive (CKAN deployment or Socrata portal) the metacatalog pipeline
 * enumerates.
 */
export type ConfiguredDrive = {
  apiService: OpenDataCatalogListing.ApiService;
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
 *
 * Empty by default. Before adding a drive here, confirm its real total
 * dataset count is small enough to fully enumerate in one run (`ava
 * pipeline run open-data-catalog-listings` has no retry/backoff for a rate
 * limit, and makes one sequential metadata request per CKAN dataset or
 * Socrata page) - HDX (`data.humdata.org`) was tried here first and
 * removed: its real catalog is 42,000+ datasets, and its rate limiter
 * rejects a sequential crawl after roughly 150 requests with no
 * `Retry-After` header, so a full HDX enumeration cannot succeed with
 * this pipeline's current design. See section 6's "deliberately
 * deferred" list.
 */
export const CONFIGURED_DRIVES: readonly ConfiguredDrive[] = [];
