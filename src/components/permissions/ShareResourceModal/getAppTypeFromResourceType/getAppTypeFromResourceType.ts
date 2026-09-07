import { matchLiteral } from "@avandar/utils";
import type { AppType } from "$/models/Permissions/Permissions";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";

/**
 * Maps a `ResourceType` to the workspace app that owns it. Datasets live
 * under `data_sources`, dashboards under `dashboards`, and maps under `gis`.
 *
 * Callers pair this with `appLabel` to name the owning app in share copy.
 */
export function getAppTypeFromResourceType(type: ResourceType): AppType {
  return matchLiteral(type, {
    dashboard: "dashboards",
    dataset: "data_sources",
    map: "gis",
  } as const);
}
