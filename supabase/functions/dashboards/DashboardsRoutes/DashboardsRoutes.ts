import { propNotEq } from "@avandar/utils";
import { defineRoutes, POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { validateDashboardSlug } from "@sbfn/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.ts";
import { z } from "zod";
import type { DashboardsApi } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types.ts";

/** Defines HTTP routes for dashboard publication helpers. */
export const DashboardsRoutes = defineRoutes<DashboardsApi>("dashboards", {
  /**
   * Check whether a dashboard slug is available. Public dashboard slugs
   * are globally unique (see `supabase/schemas/10.dashboards.sql`); non-
   * public dashboards have no slug constraint at the DB level. The
   * optional `dashboardId` lets the caller exclude the dashboard they
   * are currently editing: re-publishing a public dashboard with its
   * existing slug should validate as available rather than colliding
   * with itself.
   */
  "/validate-slug": {
    POST: POST("/validate-slug")
      .bodySchema({
        slug: z.string(),
        dashboardId: z.string().optional(),
      })
      .action(async ({ body: { slug, dashboardId }, supabaseAdminClient }) => {
        const validationFailure = validateDashboardSlug(slug);
        if (validationFailure) {
          return validationFailure;
        }

        const { data: existing, error } = await supabaseAdminClient
          .from("dashboards")
          .select("id")
          .eq("slug", slug)
          .eq("is_public", true);
        if (error) {
          throw error;
        }

        const collision =
          dashboardId ?
            (existing ?? []).find(propNotEq("id", dashboardId))
          : existing?.at(0);

        if (collision) {
          return {
            isValid: false,
            reason: "taken" as const,
          };
        }

        return { isValid: true };
      }),
  },
});
