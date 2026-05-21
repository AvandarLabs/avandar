import { Polar } from "@polar-sh/sdk";
import { getSubscriptionRowForWorkspaceSlug } from "./subscriptionAssertions";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

type PolarServerType = "sandbox" | "production";

/**
 * Creates a Polar SDK client for e2e cleanup using `.env.development` vars.
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
 * Revokes a Polar subscription immediately (best-effort).
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
 * Loads the workspace subscription row and revokes Polar if present.
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
