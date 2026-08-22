import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import { z } from "zod";

import { Subscription } from "$/models/Subscription/Subscription.ts";

const STORAGE_PAGE_SIZE = 100;

/**
 * Permanently deletes a workspace and all of its contents.
 * Only callable by the workspace owner.
 * Revokes any active Polar subscription before deleting.
 */
export const DeleteWorkspace = POST({
  path: "/:workspaceId/delete",
  schema: { workspaceId: z.uuid() },
}).action(
  async ({
    pathParams: { workspaceId },
    supabaseClient,
    supabaseAdminClient,
    user,
  }) => {
    // Verify the caller is the workspace owner. Using supabaseClient
    // (not admin) so RLS gets applied.
    const { data: workspace } = await supabaseClient
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspaceId)
      .single()
      .throwOnError();

    if (workspace.owner_id !== user.id) {
      throw new AvaHTTPError(
        "Only the workspace owner can delete a workspace.",
        FORBIDDEN,
      );
    }

    // subscriptions has ON DELETE RESTRICT, so it must be removed
    // before the workspace row. Revoke any live Polar subscription
    // first to stop billing, then delete the DB row.
    const { data: subscription } = await supabaseAdminClient
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle()
      .throwOnError();

    if (subscription !== null) {
      const subscriptionRead = Subscription.fromDbRowToRead(subscription);
      if (subscriptionRead.polarSubscriptionId !== undefined) {
        try {
          await PolarClient.revokeSubscription({
            subscriptionId: subscriptionRead.polarSubscriptionId,
          });
        } catch (error) {
          // Best-effort: a Polar API error (e.g. subscription already
          // cancelled on Polar's end) must not block deletion. But we log
          // the Polar subscription id first, because the subscriptions row
          // is deleted below - without this line nothing would be left to
          // tell support which Polar subscription still needs revoking.
          console.error(
            "Workspace deletion: Polar subscription revocation failed",
            {
              workspaceId,
              polarSubscriptionId: subscriptionRead.polarSubscriptionId,
              error,
            },
          );
        }
      }
      await supabaseAdminClient
        .from("subscriptions")
        .delete()
        .eq("id", subscription.id)
        .throwOnError();
    }

    /**
     * Every file path under `prefix`, descending into subfolders and
     * paginating each level. `storage.list()` defaults to `limit: 100` and
     * is non-recursive, so without this a workspace with more than 100
     * entries at any level would silently leave the rest behind.
     */
    const listWorkspaceStorageFilePaths = async (
      prefix: string,
    ): Promise<string[]> => {
      const entries = [];

      // Sequential because each page depends on the previous offset.
      for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
        const { data: page } = await supabaseAdminClient.storage
          .from("workspaces")
          .list(prefix, { limit: STORAGE_PAGE_SIZE, offset });

        if (!page || page.length === 0) {
          break;
        }

        entries.push(...page);

        if (page.length < STORAGE_PAGE_SIZE) {
          break;
        }
      }

      // Supabase returns id === null for folders, a string for files.
      const paths = await Promise.all(
        entries.map((entry) => {
          return entry.id === null
            ? listWorkspaceStorageFilePaths(`${prefix}/${entry.name}`)
            : Promise.resolve([`${prefix}/${entry.name}`]);
        }),
      );

      return paths.flat();
    };

    // Best-effort: recursively purge uploaded files from the workspace
    // storage folder. A failure here must not block deletion - orphaned
    // storage objects are benign, but a deleted workspace must not
    // linger in the DB.
    try {
      const filePaths = await listWorkspaceStorageFilePaths(workspaceId);
      if (filePaths.length > 0) {
        await supabaseAdminClient.storage.from("workspaces").remove(filePaths);
      }
    } catch (error) {
      console.error("Workspace deletion: storage cleanup failed", {
        workspaceId,
        error,
      });
    }

    // Delete the workspace row. The ON DELETE CASCADE rule propagates the
    // deletion to every workspace-scoped table that references it.
    await supabaseAdminClient
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)
      .throwOnError();

    return { deleted: true as const };
  },
);
