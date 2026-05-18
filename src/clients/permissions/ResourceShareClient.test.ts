import { describe, expect, it, vi } from "vitest";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

vi.mock("$/env/getSupabaseApiUrl.ts", () => {
  return {
    getSupabaseApiUrl: () => {
      return "http://test.local";
    },
  };
});

vi.mock("$/env/getSupabaseApiKey.ts", () => {
  return {
    getSupabaseApiKey: () => {
      return "test-anon-key";
    },
  };
});

const { ResourceShareClient } = await import("./ResourceShareClient");

describe("ResourceShareClient.upsertResourceShare", () => {
  it("rejects requiresAppAccess=true for non-group shares", async () => {
    await expect(
      ResourceShareClient.upsertResourceShare({
        workspaceId: "ws-1" as WorkspaceId,
        resourceType: "dataset",
        resourceId: "ds-1",
        principalType: "user",
        principalId: "u-1",
        role: "viewer",
        requiresAppAccess: true,
      }),
    ).rejects.toThrow(/requiresAppAccess applies only to user_group/);
  });

  it("rejects requiresAppAccess=true for workspace shares", async () => {
    await expect(
      ResourceShareClient.upsertResourceShare({
        workspaceId: "ws-1" as WorkspaceId,
        resourceType: "dataset",
        resourceId: "ds-1",
        principalType: "workspace",
        principalId: null,
        role: "viewer",
        requiresAppAccess: true,
      }),
    ).rejects.toThrow(/requiresAppAccess applies only to user_group/);
  });
});
