import { APIClient } from "@/clients/APIClient";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Creates a native free subscription for the workspace (no Polar checkout).
 */
export async function createFreeSubscription(options: {
  workspaceId: Workspace.Id;
}): Promise<void> {
  await APIClient.post({
    route: "subscriptions/create-free",
    body: {
      workspaceId: options.workspaceId,
    },
  });
}
