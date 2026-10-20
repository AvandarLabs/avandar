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

/** HDX's one CKAN deployment. */
export const HDX_BASE_URL = "https://data.humdata.org";

/**
 * The HDX drive the `hdx` pipeline crawls. `package_search` returns 100
 * full datasets per request, sorted by `metadata_modified`, so a full crawl
 * of HDX is about 280 requests (about 5 minutes at one request per second)
 * and an incremental run reads only what changed. Set it to `undefined` to
 * switch the pipeline off.
 */
export const HDX_DRIVE: HdxDrive | undefined = {
  baseUrl: HDX_BASE_URL,
  organizationName: "Humanitarian Data Exchange",
};
