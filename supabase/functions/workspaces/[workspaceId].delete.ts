import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import { z } from "zod";
import { Subscription } from "$/models/Subscription/Subscription.ts";

const STORAGE_PAGE_SIZE = 100;

/**
 * Buckets holding published dashboard snapshots.
 *
 * These are NOT reachable from the `workspaces` bucket sweep below. A snapshot
 * object is named `dashboards/<dashboardId>/...`, with no workspace segment
 * anywhere in the path, so nothing under the `<workspaceId>` prefix ever
 * matches one.
 */
const DASHBOARD_SNAPSHOT_BUCKETS = ["published", "published-private"] as const;

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
    const listStorageFilePaths = async (
      options: Readonly<{ bucket: string; prefix: string }>,
    ): Promise<string[]> => {
      const { bucket, prefix } = options;
      const entries = [];

      // Sequential because each page depends on the previous offset.
      for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
        const { data: page } = await supabaseAdminClient.storage
          .from(bucket)
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
            ? listStorageFilePaths({
                bucket,
                prefix: `${prefix}/${entry.name}`,
              })
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
      const filePaths = await listStorageFilePaths({
        bucket: "workspaces",
        prefix: workspaceId,
      });
      if (filePaths.length > 0) {
        await supabaseAdminClient.storage.from("workspaces").remove(filePaths);
      }
    } catch (error) {
      console.error("Workspace deletion: storage cleanup failed", {
        workspaceId,
        error,
      });
    }

    // Published dashboard snapshots, which the sweep above cannot reach.
    //
    // This has to happen BEFORE the workspace row is deleted. `dashboards`
    // cascades on `workspace_id`, and once those rows are gone nothing can
    // work out which snapshot objects belonged to this workspace: the storage
    // policies identify an object by parsing the dashboard id out of its path
    // and looking the row up. The objects would then be unreadable, and
    // undeletable through the Data API, forever.
    //
    // The DELETE policy on `dashboards` does not cover this. It requires a
    // settled `delete` claim, which is the right rule for an end user removing
    // one dashboard, but `service_role` holds BYPASSRLS and a cascade never
    // consults a policy at all. So the cleanup is this route's job.
    try {
      const { data: dashboards } = await supabaseAdminClient
        .from("dashboards")
        .select("id")
        .eq("workspace_id", workspaceId)
        .throwOnError();

      const snapshotPaths = (
        await Promise.all(
          (dashboards ?? []).flatMap((dashboard) => {
            return DASHBOARD_SNAPSHOT_BUCKETS.map(async (bucket) => {
              return {
                bucket,
                paths: await listStorageFilePaths({
                  bucket,
                  prefix: `dashboards/${dashboard.id}`,
                }),
              };
            });
          }),
        )
      ).filter((entry) => {
        return entry.paths.length > 0;
      });

      await Promise.all(
        snapshotPaths.map((entry) => {
          return supabaseAdminClient.storage
            .from(entry.bucket)
            .remove(entry.paths);
        }),
      );
    } catch (error) {
      console.error("Workspace deletion: snapshot cleanup failed", {
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
