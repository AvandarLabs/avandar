import { describe, expect, it, vi } from "vitest";
import { useCanCreateDatasets } from "@/hooks/workspaces/useCanCreateDatasets/useCanCreateDatasets";
import { renderHook } from "@/test-utils";

const mocks = vi.hoisted(() => {
  return { isSettingsAdmin: false, userId: "user-1" };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return mocks.isSettingsAdmin;
    },
  };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: mocks.userId };
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", ownerId: "owner-1" };
    },
  };
});

describe("useCanCreateDatasets", () => {
  it("lets the owner and Settings admins create datasets, and nobody else", () => {
    mocks.userId = "owner-1";
    expect(renderHook(useCanCreateDatasets).result.current).toBe(true);

    mocks.userId = "user-1";
    mocks.isSettingsAdmin = true;
    expect(renderHook(useCanCreateDatasets).result.current).toBe(true);

    mocks.isSettingsAdmin = false;
    expect(renderHook(useCanCreateDatasets).result.current).toBe(false);
  });
});
