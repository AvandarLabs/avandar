import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

/** Reasons a requested dashboard slug cannot be used. */
export type DashboardSlugValidationReason =
  | "empty"
  | "spaces"
  | "invalid_characters"
  | "too_short"
  | "too_long"
  | "taken"
  /**
   * The slug is shaped like a UUID. `/d/<slugOrId>` resolves a UUID-shaped
   * segment as a dashboard id, so a slug of that shape would be unreachable
   * and would shadow a real dashboard.
   */
  | "reserved";

/** The audience a slug is being validated for. */
export type DashboardSlugVisibility = "workspace" | "public";

/** Response returned for an invalid public dashboard slug. */
export type DashboardSlugValidationFailure = {
  isValid: false;
  reason: DashboardSlugValidationReason;
  limit?: number;
};

/** HTTP contract for dashboard-specific edge routes. */
export type DashboardsApi = APITypeDef<
  "dashboards",
  ["/validate-slug"],
  {
    /**
     * Check whether a dashboard slug is available for the given audience.
     *
     * Slugs live in two namespaces, because they are served from two URLs:
     * `public` slugs are globally unique (`/d/<slug>`), `workspace` slugs are
     * unique within their workspace (`/<workspaceSlug>/d/<slug>`).
     *
     * `dashboardId` excludes the dashboard being edited from the "already
     * taken" check, so re-publishing with the same slug still validates. It is
     * REQUIRED when `visibility` is `workspace`, because the workspace to
     * scope to is derived from it rather than trusted from the request.
     */
    "/validate-slug": {
      POST: {
        body: {
          slug: string;
          dashboardId?: string;
          visibility: DashboardSlugVisibility;
        };
        returnType:
          | {
              isValid: true;
            }
          | DashboardSlugValidationFailure;
      };
    };
  }
>;
