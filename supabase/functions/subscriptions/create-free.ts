import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { CONFLICT, FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import { uuidType } from "$/lib/zodHelpers.ts";
import { Subscription } from "$/models/Subscription/Subscription.ts";
import type { User } from "$/models/User/User.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";

/**
 * Creates a native free subscription for a workspace without involving Polar.
 */
export const CreateFreeSubscription = POST("/create-free")
  .bodySchema({
    workspaceId: uuidType<WorkspaceId>(),
  })
  .action(async ({ body, supabaseAdminClient, user }) => {
    const { workspaceId } = body;

    const { data: workspace } = await supabaseAdminClient
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspaceId)
      .single()
      .throwOnError();

    if (workspace.owner_id !== user.id) {
      throw new AvaHTTPError(
        "Only the workspace owner can create a subscription for this workspace.",
        FORBIDDEN,
      );
    }

    const { data: existingSubscription } = await supabaseAdminClient
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle()
      .throwOnError();

    const nativeFreeFields = Subscription.buildNativeFreeFieldsForDB({
      workspaceId,
      subscriptionOwnerId: user.id as User.Id,
    });

    if (existingSubscription !== null) {
      const existingRead = Subscription.fromDbRowToRead(existingSubscription);

      // The workspace is already on the native free plan, so there is
      // nothing for this endpoint to do.
      if (
        Subscription.isNativeFreeSubscription(existingRead) &&
        Subscription.doesSubscriptionGrantEntitlements(existingRead)
      ) {
        throw new AvaHTTPError(
          "This workspace is already on the native Free plan.",
          CONFLICT,
        );
      }

      // The workspace has an active Polar-backed subscription, so we
      // first revoke it on Polar to stop billing and webhook activity
      // before flipping the row to native free.
      if (
        existingRead.polarSubscriptionId !== undefined &&
        Subscription.doesSubscriptionGrantEntitlements(existingRead)
      ) {
        await PolarClient.revokeSubscription({
          subscriptionId: existingRead.polarSubscriptionId,
        });
      } else if (
        // The row is in some other active paid state we cannot safely
        // overwrite, so we reject the request rather than corrupt it.
        !Subscription.shouldCreateNativeFreeSubscription(existingRead)
      ) {
        throw new AvaHTTPError(
          "This workspace already has an active subscription.",
          CONFLICT,
        );
      }

      // Update the existing row in place so we preserve the Avandar
      // subscription id and any foreign keys that already reference it.
      const { data: subscription } = await supabaseAdminClient
        .from("subscriptions")
        .update(nativeFreeFields)
        .eq("id", existingSubscription.id)
        .select()
        .single()
        .throwOnError();

      return { subscription };
    }

    const { data: subscription } = await supabaseAdminClient
      .from("subscriptions")
      .insert(nativeFreeFields)
      .select()
      .single()
      .throwOnError();

    return { subscription };
  });
