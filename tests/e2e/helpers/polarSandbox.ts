import { Polar } from "@polar-sh/sdk";
import { getSubscriptionRowForWorkspaceSlug } from "./subscriptionAssertions";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

type PolarServerType = "sandbox" | "production";

/**
 * Creates the configured Polar client for `bestEffortRevokePolarSubscription`.
 * Returns undefined when the token or server configuration is missing or
 * invalid.
 */
function _createE2EPolarClient(): Polar | undefined {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const serverType = process.env.POLAR_SERVER_TYPE as
    | PolarServerType
    | undefined;

  if (!accessToken) {
    console.warn("[e2e] POLAR_ACCESS_TOKEN missing; skipping Polar cleanup.");
    return undefined;
  }

  if (serverType !== "sandbox" && serverType !== "production") {
    console.warn(
      "[e2e] POLAR_SERVER_TYPE must be sandbox or production; " +
        "skipping Polar cleanup.",
    );
    return undefined;
  }

  return new Polar({
    accessToken,
    server: serverType,
  });
}

/**
 * Attempts to revoke a Polar subscription immediately and logs revoke failures.
 * Use it, for example, to clean up a subscription after an end-to-end test.
 */
export async function bestEffortRevokePolarSubscription(options: {
  polarSubscriptionId: string;
}): Promise<void> {
  const polar = _createE2EPolarClient();
  if (!polar) {
    return;
  }

  try {
    await polar.subscriptions.revoke({ id: options.polarSubscriptionId });
    console.log(
      `[e2e] Revoked Polar subscription ${options.polarSubscriptionId}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[e2e] Polar revoke failed for ${options.polarSubscriptionId}: ` +
        `${message}`,
    );
  }
}

/**
 * Attempts to revoke the Polar subscription associated with a workspace, if
 * present.
 * Use it, for example, to clean up a workspace after a billing test.
 */
export async function bestEffortRevokePolarSubscriptionForWorkspace(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceSlug: string;
}): Promise<void> {
  const row = await getSubscriptionRowForWorkspaceSlug({
    supabaseAdminClient: options.supabaseAdminClient,
    workspaceSlug: options.workspaceSlug,
  });

  if (row?.polar_subscription_id) {
    await bestEffortRevokePolarSubscription({
      polarSubscriptionId: row.polar_subscription_id,
    });
  }
}
