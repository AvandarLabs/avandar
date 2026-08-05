import { t } from "@lingui/core/macro";
import type { Database } from "$/types/database.types";

type ResourceType = Database["public"]["Enums"]["resource_type"];

/**
 * Returns the human-readable label for a resource type ("dataset" /
 * "dashboard"). Shared copy used in headings, tooltips, and summary lines
 * wherever a `ResourceType` is surfaced to the user.
 */
export function resourceTypeLabel(type: ResourceType): string {
  return type === "dashboard" ? t`dashboard` : t`dataset`;
}
