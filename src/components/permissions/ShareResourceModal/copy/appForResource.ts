import { matchLiteral } from "@avandar/utils";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { AppType } from "$/models/Permissions/Permissions.types";

/**
 * Maps a `ResourceType` to the workspace app that owns it. Datasets live
 * under `data_sources`, dashboards under `dashboards`, and maps under `gis`.
 *
 * Not copy itself, but it exists only to feed `appLabel`, so it lives beside
 * the copy that consumes it rather than in the component tree.
 */
export function appForResource(type: ResourceType): AppType {
  return matchLiteral(type, {
    dashboard: "dashboards",
    dataset: "data_sources",
    map: "gis",
  } as const);
}
