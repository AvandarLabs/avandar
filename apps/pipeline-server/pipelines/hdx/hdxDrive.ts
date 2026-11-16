import { getOrganizationLabelsFromDrive } from "@avandar/etl";
import type { EtlOrganizationLabels, PipelineConfig } from "@avandar/etl";

/** HDX's one CKAN deployment. */
export const HDX_BASE_URL = "https://data.humdata.org";

/**
 * The HDX drive (`data.humdata.org`), from `hdx.pipeline.yaml`. HDX is a
 * single CKAN deployment, not a federated service with many portals
 * underneath it, so the config lists at most one drive and a second would
 * be an error. See `connector-nomenclature.md`'s "One pipeline per service"
 * section.
 */
export type HdxDrive = Readonly<{
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  /** What each organization level is called on HDX. */
  organizationLabels: EtlOrganizationLabels;
}>;

/**
 * The drives `hdx.pipeline.yaml` lists, with labels resolved. A full crawl
 * of the drive takes about 280 `package_search` requests (about 5 minutes
 * at one request per second, 100 full datasets each, sorted by
 * `metadata_modified`) and an incremental run reads only what changed. An
 * empty `drives` list switches the pipeline off.
 *
 * @param config - The parsed HDX pipeline config.
 * @returns At most one drive.
 * @throws When the config lists more than one drive, or one that is not
 * `HDX_BASE_URL`, or gives a drive `scopes` (HDX's scopes are by format and
 * live in `hdxScopes.ts`).
 */
export function listHdxDrives(config: PipelineConfig): readonly HdxDrive[] {
  if (config.drives.length > 1) {
    throw new Error(
      "hdx.pipeline.yaml lists more than one drive. HDX is one CKAN deployment.",
    );
  }
  return config.drives.map((drive) => {
    if (drive.baseUrl !== HDX_BASE_URL) {
      throw new Error(
        `hdx.pipeline.yaml's drive must be ${HDX_BASE_URL}, not ${drive.baseUrl}.`,
      );
    }
    if (drive.scopes !== undefined) {
      throw new Error(
        "hdx.pipeline.yaml's drive cannot set scopes: HDX's scopes are in hdxScopes.ts.",
      );
    }
    return {
      baseUrl: drive.baseUrl,
      organizationLabels: getOrganizationLabelsFromDrive({ config, drive }),
    };
  });
}
