import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
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
      throw new Error(
        "Only the workspace owner can create a subscription for this workspace.",
      );
    }

    const { data: existingSubscription } = await supabaseAdminClient
      .from("subscriptions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle()
      .throwOnError();

    if (existingSubscription !== null) {
      throw new Error(
        "This workspace already has a subscription.",
      );
    }

    const startedAt = new Date().toISOString();

    const { data: subscription } = await supabaseAdminClient
      .from("subscriptions")
      .insert({
        workspace_id: workspaceId,
        subscription_owner_id: user.id,
        feature_plan_type: "free",
        subscription_status: "active",
        started_at: startedAt,
        current_period_start: startedAt,
        current_period_end: null,
        ends_at: null,
        ended_at: null,
        polar_subscription_id: null,
        polar_customer_id: null,
        polar_customer_email: null,
        polar_product_id: null,
        ...Subscription.computeSubscriptionLimitsForDB({
          featurePlan: "free",
          numSeats: 1,
        }),
      })
      .select()
      .single()
      .throwOnError();

    return { subscription };
  });
