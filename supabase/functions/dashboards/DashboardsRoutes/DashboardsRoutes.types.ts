import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

/** Reasons a requested public dashboard slug cannot be used. */
export type DashboardSlugValidationReason =
  | "empty"
  | "spaces"
  | "invalid_characters"
  | "too_short"
  | "too_long"
  | "taken";

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
     * Check whether a dashboard slug is available for use as a public
     * vanity URL (`/d/<slug>`). Public dashboard slugs are globally
     * unique; non-public dashboards have no slug constraint. The optional
     * `dashboardId` excludes the dashboard the user is currently editing
     * from the "already taken" check so re-publishing with the same slug
     * still validates.
     */
    "/validate-slug": {
      POST: {
        body: {
          slug: string;
          dashboardId?: string;
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
