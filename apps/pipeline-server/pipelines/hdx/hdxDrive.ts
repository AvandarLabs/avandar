/**
 * The one HDX drive (`data.humdata.org`) this pipeline would enumerate.
 * There is no `ConfiguredDrive[]` registry here, unlike the Socrata
 * pipeline's: HDX is a single CKAN deployment, not a federated service with
 * many portals underneath it, so a list of one would only imply a second
 * drive this pipeline will never have. See
 * `connector-nomenclature.md`'s "One pipeline per service" section.
 */
export type HdxDrive = {
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  /**
   * Used as every discovered dataset's `external_organization_name`.
   * `CkanClient`'s `package_show` has an organization field, but this
   * pipeline names it once here instead of parsing it, for the same reason
   * `configuredDrives.ts` gives for Socrata.
   */
  organizationName: string;
};

/**
 * Undefined by default. Before setting this, confirm HDX's real dataset
 * count is small enough to fully enumerate in one run (`ava pipeline run
 * hdx` has no retry/backoff for a rate limit, and makes one sequential
 * metadata request per CKAN dataset) - HDX was tried here first and
 * removed: its real catalog is 42,000+ datasets, and its rate limiter
 * rejects a sequential crawl after roughly 150 requests with no
 * `Retry-After` header, so a full HDX enumeration cannot succeed with this
 * pipeline's current design. See `open-data-catalog-architecture.md`
 * section 7's "deliberately deferred" list.
 */
export const HDX_DRIVE: HdxDrive | undefined = undefined;
