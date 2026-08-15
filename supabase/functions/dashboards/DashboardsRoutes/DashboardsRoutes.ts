import { propNotEq } from "@avandar/utils";
import { defineRoutes, POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { validateDashboardSlug } from "@sbfn/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.ts";
import { z } from "zod";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { DashboardsApi } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types.ts";

const TAKEN_SLUG = { isValid: false, reason: "taken" as const };

async function _getAuthorizedWorkspaceId(
  options: Readonly<{
    dashboardId: string;
    supabaseClient: AvaSupabaseClient;
    supabaseAdminClient: AvaSupabaseClient;
  }>,
): Promise<string | undefined> {
  const { dashboardId, supabaseAdminClient, supabaseClient } = options;
  const { data: canEditSubject, error: authorizationError } =
    await supabaseClient.rpc("util__auth_user_can_access_resource", {
      p_resource_type: "dashboard",
      p_resource_id: dashboardId,
      p_min_role: "editor",
    });
  if (authorizationError) {
    throw authorizationError;
  }
  if (!canEditSubject) {
    return undefined;
  }
  const { data: subject, error: subjectError } = await supabaseAdminClient
    .from("dashboards")
    .select("workspace_id")
    .eq("id", dashboardId)
    .maybeSingle();
  if (subjectError) {
    throw subjectError;
  }
  return subject?.workspace_id;
}

function _hasSlugCollision(
  options: Readonly<{
    dashboardId: string | undefined;
    existing: Array<{ id: string }> | null;
  }>,
): boolean {
  const { dashboardId, existing } = options;
  return dashboardId ?
      (existing ?? []).find(propNotEq("id", dashboardId)) !== undefined
    : existing?.at(0) !== undefined;
}

/** Defines HTTP routes for dashboard publication helpers. */
export const DashboardsRoutes = defineRoutes<DashboardsApi>("dashboards", {
  /**
   * Check whether a dashboard slug is available for the requested audience.
   *
   * Slugs live in two namespaces (see
   * `dashboards__slug_unique_when_public` and
   * `dashboards__slug_unique_per_workspace_when_internal` in
   * `supabase/schemas/10.dashboards.sql`): public slugs are globally unique,
   * workspace slugs are unique within their workspace.
   *
   * The workspace to scope to is looked up from `dashboardId` with the admin
   * client. It is deliberately not accepted from the request body: a
   * client-supplied workspace id would let a caller probe another tenant's
   * slug namespace.
   */
  "/validate-slug": {
    POST: POST("/validate-slug")
      .bodySchema({
        slug: z.string(),
        dashboardId: z.string().optional(),
        visibility: z.enum(["workspace", "public"]),
      })
      .action(
        async ({
          body: { slug, dashboardId, visibility },
          supabaseClient,
          supabaseAdminClient,
        }) => {
          const validationFailure = validateDashboardSlug(slug);
          if (validationFailure) {
            return validationFailure;
          }

          let query = supabaseAdminClient
            .from("dashboards")
            .select("id")
            .eq("slug", slug)
            .eq("visibility", visibility);

          if (visibility === "workspace") {
            // Scope to the dashboard's own workspace. Without a dashboard we
            // have no workspace to scope to, and falling back to a global
            // check would report collisions that do not exist.
            if (!dashboardId) {
              return TAKEN_SLUG;
            }
            const workspaceId = await _getAuthorizedWorkspaceId({
              dashboardId,
              supabaseAdminClient,
              supabaseClient,
            });
            if (!workspaceId) {
              return TAKEN_SLUG;
            }
            query = query.eq("workspace_id", workspaceId);
          }

          const { data: existing, error } = await query;
          if (error) {
            throw error;
          }

          if (_hasSlugCollision({ dashboardId, existing })) {
            return TAKEN_SLUG;
          }

          return { isValid: true };
        },
      ),
  },
});
