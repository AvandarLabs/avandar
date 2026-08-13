import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import type { AppType } from "$/models/Permissions/Permissions.types.ts";

/**
 * Returns the human-readable label for a workspace app ("Data Sources",
 * "Dashboards", …). Shared copy used anywhere an `AppType` is surfaced to
 * the user (share modal general-access copy, role matrix, tooltips).
 */
export function appLabel(app: AppType): string {
  return matchLiteral(app, {
    data_sources: () => {
      return t`Data Sources`;
    },
    dashboards: () => {
      return t`Dashboards`;
    },
    data_explorer: () => {
      return t`Data Explorer`;
    },
    settings: () => {
      return t`Settings`;
    },
  });
}
