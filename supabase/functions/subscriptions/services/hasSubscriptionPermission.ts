import { matchLiteral } from "@avandar/utils";
import { Subscription } from "$/models/Subscription/Subscription.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Tables } from "$/types/database.types.ts";

type SubscriptionPermissionOptions = {
  permissionType: Subscription.Permission;
  supabaseAdminClient: AvaSupabaseClient;
  userId: UserId;
} & (
  | {
      subscriptionId: Subscription.PolarId | Subscription.Id;
      workspaceId?: undefined;
    }
  | {
      subscriptionId?: undefined;
      workspaceId: Workspace.Id;
    }
);

/**
 * Returns whether the user may perform the given subscription-scoped action.
 */
export async function hasSubscriptionPermission(
  options: SubscriptionPermissionOptions,
): Promise<boolean> {
  const { permissionType, supabaseAdminClient, userId } = options;

  const dbSubscription =
    options.subscriptionId !== undefined ?
      await _loadSubscriptionByIdOrPolarId({
        supabaseAdminClient,
        subscriptionId: options.subscriptionId,
      })
    : (
        await supabaseAdminClient
          .from("subscriptions")
          .select("*")
          .eq("workspace_id", options.workspaceId)
          .maybeSingle()
          .throwOnError()
      ).data;

  if (dbSubscription === null) {
    return false;
  }

  const isMember = await _isWorkspaceMember({
    supabaseAdminClient,
    workspaceId: dbSubscription.workspace_id as Workspace.Id,
    userId,
  });

  if (
    !Subscription.canQuerySubscriptionPermission({
      subscriptionFound: true,
      isWorkspaceMember: isMember,
    })
  ) {
    return false;
  }

  const subscription = Subscription.fromDbRowToRead(dbSubscription);

  return matchLiteral(permissionType, {
    can_add_datasets: async () => {
      const { count } = await supabaseAdminClient
        .from("datasets")
        .select("id", { count: "exact" })
        .eq("workspace_id", subscription.workspaceId)
        .throwOnError();
      if (count === null) {
        return false;
      }
      return Subscription.canAddDatasets({
        subscription,
        numDatasetsInWorkspace: count,
      });
    },

    can_invite_users: async () => {
      const [{ count: numMembers }, { count: numPendingInvites }] =
        await Promise.all([
          supabaseAdminClient
            .from("workspace_memberships")
            .select("id", { count: "exact" })
            .eq("workspace_id", subscription.workspaceId)
            .throwOnError(),
          supabaseAdminClient
            .from("workspace_invites")
            .select("id", { count: "exact" })
            .eq("workspace_id", subscription.workspaceId)
            .eq("invite_status", "pending")
            .throwOnError(),
        ]);

      if (numMembers === null || numPendingInvites === null) {
        return false;
      }

      return Subscription.canInviteMembers({
        subscription,
        numMembersInWorkspace: numMembers + numPendingInvites,
      });
    },

    can_publish_shareable_dashboard: async () => {
      // Mirrors util__dashboard_counts_as_shareable. A dashboard counts when
      // someone other than its owner can reach it: public always, workspace
      // only when it is not private to its owner. Drafts never count.
      const { data: dashboards } = await supabaseAdminClient
        .from("dashboards")
        .select("id, owner_id, visibility, is_restricted")
        .eq("workspace_id", subscription.workspaceId)
        .neq("visibility", "draft")
        .throwOnError();

      if (dashboards === null) {
        return false;
      }

      // Only restricted workspace dashboards need the share lookup; public
      // ones count regardless, and unrestricted workspace ones are reachable
      // by every tag-based app role by default.
      const restrictedWorkspaceDashboards = dashboards.filter((dashboard) => {
        return dashboard.visibility === "workspace" && dashboard.is_restricted;
      });
      const candidateIds = restrictedWorkspaceDashboards.map((dashboard) => {
        return dashboard.id;
      });

      const { data: shares } = await supabaseAdminClient
        .from("resource_shares")
        .select("resource_id, principal_type, principal_id")
        .eq("resource_type", "dashboard")
        .in("resource_id", candidateIds.length > 0 ? candidateIds : [""])
        .throwOnError();

      // util__has_non_owner_share ignores a share whose principal IS the
      // resource's owner (resource_shares can hold such a row; nothing in the
      // schema forbids it), so a dashboard only counts as shared here if at
      // least one share row names a principal other than its own owner.
      const ownerIdByDashboardId = new Map(
        restrictedWorkspaceDashboards.map((dashboard) => {
          return [dashboard.id, dashboard.owner_id];
        }),
      );

      const nonOwnerSharedIds = new Set(
        (shares ?? [])
          .filter((share) => {
            const ownerId = ownerIdByDashboardId.get(share.resource_id);
            return (
              share.principal_type !== "user" || share.principal_id !== ownerId
            );
          })
          .map((share) => {
            return share.resource_id;
          }),
      );

      const numShareable = dashboards.filter((dashboard) => {
        if (dashboard.visibility === "public") {
          return true;
        }
        return !dashboard.is_restricted || nonOwnerSharedIds.has(dashboard.id);
      }).length;

      return Subscription.canPublishShareableDashboard({
        subscription,
        numShareableDashboardsInWorkspace: numShareable,
      });
    },
  });
}

async function _loadSubscriptionByIdOrPolarId(options: {
  supabaseAdminClient: AvaSupabaseClient;
  subscriptionId: Subscription.PolarId | Subscription.Id;
}): Promise<Tables<"subscriptions"> | null> {
  const { supabaseAdminClient, subscriptionId } = options;

  const byPolarId = await supabaseAdminClient
    .from("subscriptions")
    .select("*")
    .eq("polar_subscription_id", subscriptionId)
    .maybeSingle()
    .throwOnError();

  if (byPolarId.data !== null) {
    return byPolarId.data;
  }

  const byRowId = await supabaseAdminClient
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .maybeSingle()
    .throwOnError();

  return byRowId.data;
}

async function _isWorkspaceMember(options: {
  supabaseAdminClient: AvaSupabaseClient;
  workspaceId: Workspace.Id;
  userId: UserId;
}): Promise<boolean> {
  const { supabaseAdminClient, workspaceId, userId } = options;

  const { data: membership } = await supabaseAdminClient
    .from("workspace_memberships")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()
    .throwOnError();

  return membership !== null;
}
