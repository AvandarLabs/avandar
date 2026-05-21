import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { CONFLICT, FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import { Subscription } from "$/models/Subscription/Subscription.ts";
import { z } from "zod";

/**
 * Creates a native free subscription for a workspace without involving Polar.
 */
export const CreateFreeSubscription = POST("/create-free")
  .bodySchema({
    workspaceId: z.uuid(),
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
      .select(
        "id, polar_subscription_id, subscription_status, feature_plan_type",
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle()
      .throwOnError();

    const nativeFreeFields = Subscription.buildNativeFreeFieldsForDB({
      workspaceId,
      subscriptionOwnerId: user.id,
    });

    if (existingSubscription !== null) {
      const existingRead = Subscription.fromDbRowToRead(existingSubscription);

      if (
        Subscription.isNativeFreeSubscription(existingRead) &&
        Subscription.grantsWorkspaceEntitlements(existingRead)
      ) {
        throw new AvaHTTPError(
          "This workspace is already on the native Free plan.",
          CONFLICT,
        );
      }

      if (
        existingRead.polarSubscriptionId !== undefined &&
        Subscription.grantsWorkspaceEntitlements(existingRead)
      ) {
        await PolarClient.revokeSubscription({
          subscriptionId: existingRead.polarSubscriptionId,
        });
      } else if (
        !Subscription.shouldCreateNativeFreeSubscription(existingRead)
      ) {
        throw new AvaHTTPError(
          "This workspace already has an active subscription.",
          CONFLICT,
        );
      }

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
