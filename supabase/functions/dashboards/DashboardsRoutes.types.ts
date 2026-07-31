import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

export type DashboardsAPI = APITypeDef<
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
          | {
              isValid: false;
              reason: string;
            };
      };
    };
  }
>;
