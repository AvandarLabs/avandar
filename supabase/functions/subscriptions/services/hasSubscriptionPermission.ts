import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral.ts";
import { Subscription } from "$/models/Subscription/Subscription.ts";
import { SubscriptionParsers } from "$/models/Subscription/SubscriptionParsers.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";

type SubscriptionPermissionOptions = {
  permissionType: Subscription.Permission;
  supabaseAdminClient: AvaSupabaseClient;
} & (
  | {
      subscriptionId: Subscription.Id;
      workspaceId?: undefined;
    }
  | {
      subscriptionId?: undefined;
      workspaceId: WorkspaceId;
    }
);

export async function hasSubscriptionPermission(
  options: SubscriptionPermissionOptions,
): Promise<boolean> {
  const { permissionType, supabaseAdminClient } = options;
  const { data: dbSubscription } =
    options.subscriptionId !== undefined ?
      await supabaseAdminClient
        .from("subscriptions")
        .select("*")
        .eq("polar_subscription_id", options.subscriptionId)
        .single()
        .throwOnError()
    : await supabaseAdminClient
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", options.workspaceId)
        .single()
        .throwOnError();

  const subscription =
    SubscriptionParsers.fromDBReadToModelRead(dbSubscription);

  return matchLiteral(permissionType, {
    can_add_datasets: async () => {
      // get number of datasets in workspace
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
