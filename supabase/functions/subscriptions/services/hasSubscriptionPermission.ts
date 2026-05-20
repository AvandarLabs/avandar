import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral.ts";
import { Subscription } from "$/models/Subscription/Subscription.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Tables } from "$/types/database.types.ts";

type SubscriptionPermissionOptions = {
  permissionType: Subscription.Permission;
  supabaseAdminClient: AvaSupabaseClient;
  userId: UserId;
} & (
  | {
      subscriptionId: Subscription.Id | Subscription.RowId;
      workspaceId?: undefined;
    }
  | {
      subscriptionId?: undefined;
      workspaceId: UUID<"Workspace">;
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
    workspaceId: dbSubscription.workspace_id,
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
  });
}

async function _loadSubscriptionByIdOrPolarId(options: {
  supabaseAdminClient: AvaSupabaseClient;
  subscriptionId: Subscription.Id | Subscription.RowId;
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
  workspaceId: UUID<"Workspace">;
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
