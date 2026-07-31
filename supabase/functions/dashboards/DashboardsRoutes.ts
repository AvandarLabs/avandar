import { defineRoutes, POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { z } from "zod";
import type { DashboardsAPI } from "@sbfn/dashboards/DashboardsRoutes.types.ts";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 64;

/**
 * Route handler for all dashboards endpoints.
 *
 * All user-facing error messages refer to the slug as the dashboard's
 * "custom URL" because that's how the publish modal presents it.
 */
export const DashboardsRoutes = defineRoutes<DashboardsAPI>("dashboards", {
  /**
   * Check whether a dashboard slug is available. Public dashboard slugs
   * are globally unique (see `supabase/schemas/10.dashboards.sql`); non-
   * public dashboards have no slug constraint at the DB level. The
   * optional `dashboardId` lets the caller exclude the dashboard they
   * are currently editing — re-publishing a public dashboard with its
   * existing slug should validate as available rather than colliding
   * with itself.
   */
  "/validate-slug": {
    POST: POST("/validate-slug")
      .bodySchema({
        slug: z.string(),
        dashboardId: z.string().optional(),
      })
      .disableJWTVerification()
      .action(async ({ body: { slug, dashboardId }, supabaseAdminClient }) => {
        if (!slug) {
          return {
            isValid: false,
            reason: "The custom URL cannot be empty",
          };
        }

        if (slug.includes(" ")) {
          return {
            isValid: false,
            reason: "The custom URL cannot contain spaces",
          };
        }

        if (!slug.match(/^[a-z0-9-]+$/)) {
          return {
            isValid: false,
            reason:
              "The custom URL can only contain lowercase letters, numbers, and hyphens",
          };
        }

        if (slug.length < SLUG_MIN_LENGTH) {
          return {
            isValid: false,
            reason: `The custom URL is too short. It must be at least ${SLUG_MIN_LENGTH} characters.`,
          };
        }
        if (slug.length > SLUG_MAX_LENGTH) {
          return {
            isValid: false,
            reason: `The custom URL is too long. It cannot be longer than ${SLUG_MAX_LENGTH} characters.`,
          };
        }

        const { data: existing } = await supabaseAdminClient
          .from("dashboards")
          .select("id")
          .eq("slug", slug)
          .eq("is_public", true);

        const collision = (existing ?? []).find((row) => {
          return row.id !== dashboardId;
        });

        if (collision) {
          return {
            isValid: false,
            reason: "This custom URL is already taken",
          };
        }

        return { isValid: true };
      }),
  },
});
