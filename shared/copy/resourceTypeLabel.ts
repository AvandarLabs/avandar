import type { Database } from "$/types/database.types.ts";

import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";

/**
 * Returns the human-readable label for a resource type. Shared copy used in
 * headings, tooltips, and summary lines wherever a `ResourceType` is surfaced
 * to the user.
 */
export function resourceTypeLabel(
  type: Database["public"]["Enums"]["resource_type"],
): string {
  return matchLiteral(type, {
    dashboard: t`dashboard`,
    dataset: t`dataset`,
    map: t`map`,
  });
}
