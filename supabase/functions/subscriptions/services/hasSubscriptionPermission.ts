import { camelCaseKeysShallow, matchLiteral, prop } from "@avandar/utils";
import { countShareableDashboards } from "$/models/Dashboard/countShareableDashboards/countShareableDashboards.ts";
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
    can_add_datasets: () => {
      return _canAddDatasets({ supabaseAdminClient, subscription });
    },
    can_invite_users: () => {
      return _canInviteUsers({ supabaseAdminClient, subscription });
    },
    can_publish_shareable_dashboard: () => {
      return _canPublishShareableDashboard({
        supabaseAdminClient,
        subscription,
      });
    },
  });
}

/** Whether the workspace is still under its plan's dataset allowance. */
async function _canAddDatasets(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    subscription: Subscription.T;
  }>,
): Promise<boolean> {
  const { supabaseAdminClient, subscription } = options;

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
}

/**
 * Whether the workspace is still under its plan's seat allowance. Pending
 * invites count as seats: accepting one must never push the workspace over.
 */
async function _canInviteUsers(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    subscription: Subscription.T;
  }>,
): Promise<boolean> {
  const { supabaseAdminClient, subscription } = options;

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
}

/**
 * Whether the workspace is still under its plan's allowance of dashboards that
 * somebody other than their owner can reach.
 */
async function _canPublishShareableDashboard(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    subscription: Subscription.T;
  }>,
): Promise<boolean> {
  const { supabaseAdminClient, subscription } = options;

  // The counting rule itself lives in `countShareableDashboards`, in
  // `shared/`, because nothing type-checks, lints or tests this file. Only
  // the two queries belong here.
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
  const candidateIds = dashboards
    .filter((dashboard) => {
      return dashboard.visibility === "workspace" && dashboard.is_restricted;
    })
    .map(prop("id"));

  const { data: shares } = await supabaseAdminClient
    .from("resource_shares")
    .select("resource_id, principal_type, principal_id")
    .eq("resource_type", "dashboard")
    // Mirrors the `rs.workspace_id = p_workspace_id` predicate in
    // `util__has_non_owner_share`. Not redundant with the resource_id
    // filter: without it a share row carrying a mismatched workspace_id
    // would count here but not in SQL, so this gate would let a user
    // through the UI only for the trigger to refuse the write.
    .eq("workspace_id", subscription.workspaceId)
    .in("resource_id", candidateIds.length > 0 ? candidateIds : [""])
    .throwOnError();

  // Both selects name exactly the columns the counter's two row shapes
  // declare, so camel-casing the keys is the whole conversion.
  const numShareable = countShareableDashboards({
    dashboards: dashboards.map((dashboard) => {
      return camelCaseKeysShallow(dashboard);
    }),
    shares: (shares ?? []).map((share) => {
      return camelCaseKeysShallow(share);
    }),
  });

  return Subscription.canPublishShareableDashboard({
    subscription,
    numShareableDashboardsInWorkspace: numShareable,
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
