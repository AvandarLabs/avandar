import { getOrganizationLabelsFromDrive } from "@avandar/etl";
import type { EtlOrganizationLabels, PipelineConfig } from "@avandar/etl";

/** The WHO Global Health Observatory's OData API. */
export const GHO_BASE_URL = "https://ghoapi.azureedge.net/api";

/**
 * The GHO drive, from `gho.pipeline.yaml`. GHO is one OData service, so the
 * config lists at most one drive. See `connector-nomenclature.md`'s "One
 * pipeline per service" section.
 */
export type GhoDrive = Readonly<{
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  /** What each organization level is called on GHO. */
  organizationLabels: EtlOrganizationLabels;
}>;

/**
 * The drives `gho.pipeline.yaml` lists, with labels resolved. An empty
 * `drives` list switches the pipeline off.
 *
 * @param config - The parsed GHO pipeline config.
 * @returns At most one drive.
 * @throws When the config lists more than one drive, or one that is not
 * `GHO_BASE_URL`, or gives a drive `scopes` (GHO's scopes are fixed in
 * `createGhoEtlEngine`).
 */
export function listGhoDrives(config: PipelineConfig): readonly GhoDrive[] {
  if (config.drives.length > 1) {
    throw new Error(
      "gho.pipeline.yaml lists more than one drive. GHO is one OData service.",
    );
  }
  return config.drives.map((drive) => {
    if (drive.baseUrl !== GHO_BASE_URL) {
      throw new Error(
        `gho.pipeline.yaml's drive must be ${GHO_BASE_URL}, not ${drive.baseUrl}.`,
      );
    }
    if (drive.scopes !== undefined) {
      throw new Error(
        "gho.pipeline.yaml's drive cannot set scopes: GHO's scopes are fixed in createGhoEtlEngine.",
      );
    }
    return {
      baseUrl: drive.baseUrl,
      organizationLabels: getOrganizationLabelsFromDrive({ config, drive }),
    };
  });
}
