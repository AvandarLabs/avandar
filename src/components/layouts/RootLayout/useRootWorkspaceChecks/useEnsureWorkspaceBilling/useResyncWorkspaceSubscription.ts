import { useQuery } from "@avandar/query-hooks";
import { propEq } from "@avandar/utils";
import { useQueryClient } from "@tanstack/react-query";
import { APIClient } from "@/clients/APIClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Syncs the workspace's subscription from Polar before the plan picker
 * opens. A paid checkout normally reaches our database through the Polar
 * webhook or the checkout success page. If both are missed, this recovers
 * the subscription instead of asking a paying user to pick a plan again.
 *
 * Called only by `useEnsureWorkspaceBilling`, which keeps the plan picker
 * closed while `isResyncing` is true.
 *
 * @returns `isResyncing`, which stays true until the sync settles and,
 * when it recovered a subscription, the workspace has refetched with it.
 */
export function useResyncWorkspaceSubscription(
  options: Readonly<{ workspaceId: Workspace.Id; isEnabled: boolean }>,
): { isResyncing: boolean } {
  const { workspaceId, isEnabled } = options;
  const userId = useCurrentUser()?.id;
  const queryClient = useQueryClient();
  const isSyncEnabled = isEnabled && userId !== undefined;

  const [, , { isPending, isFetching }] = useQuery({
    queryKey: ["subscriptions", "fetch-and-sync", userId, workspaceId],
    queryFn: async () => {
      if (userId === undefined) {
        return false;
      }
      const { subscriptions } = await APIClient.get({
        route: "subscriptions/fetch-and-sync",
        queryParams: { userId, workspaceId },
      });
      const hasRecoveredSubscription = subscriptions.some(
        propEq("workspace_id", workspaceId),
      );
      if (hasRecoveredSubscription) {
        // Settle only after the workspace refetches with its subscription,
        // so the plan picker never opens in between.
        await queryClient.invalidateQueries({
          queryKey: [WorkspaceClient.getClientName()],
        });
      }
      return hasRecoveredSubscription;
    },
    enabled: isSyncEnabled,
    // Every enable runs a fresh sync. A cached or persisted "no plan" result
    // would let the plan picker open for a workspace that has paid since.
    staleTime: 0,
    meta: { persist: false },
    // A failed sync falls back to the plan picker right away rather than
    // holding it back through retries.
    retry: false,
  });

  // `isPending` also covers the persisted-cache restore, when TanStack
  // reports the query as idle before its first fetch.
  return { isResyncing: isSyncEnabled && (isPending || isFetching) };
}
