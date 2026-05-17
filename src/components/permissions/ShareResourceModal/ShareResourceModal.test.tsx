import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { render } from "@/utils/testing-utils";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id-1", slug: "test-workspace" };
    },
  };
});

vi.mock("@/clients/permissions/ResourceShareClient", () => {
  return {
    ResourceShareClient: {
      QueryKeys: {
        getResourceSharingState: vi.fn(() => {
          return ["share-state-key"];
        }),
      },
      useGetResourceSharingState: () => {
        return [
          {
            isRestricted: false,
            shares: [],
            resourceTagIds: [],
          },
          false,
        ] as const;
      },
      useUpsertResourceShare: () => {
        return [vi.fn(), false] as const;
      },
      useDeleteResourceShare: () => {
        return [vi.fn()] as const;
      },
      useSetResourceRestricted: () => {
        return [vi.fn(), false] as const;
      },
      useSetResourceUserGroupTags: () => {
        return [vi.fn(), false] as const;
      },
    },
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      useGetUsersForWorkspace: () => {
        return [
          [
            {
              userId: "user-1",
              displayName: "Alice",
              fullName: "Alice Example",
            },
          ],
        ] as const;
      },
    },
  };
});

vi.mock("@/clients/permissions/PermissionsClient", () => {
  return {
    PermissionsClient: {
      useGetUserGroups: () => {
        return [[{ id: "group-1", name: "Engineering" }], false] as const;
      },
    },
  };
});

describe("ShareResourceModal", () => {
  it("renders grouped add-member select without crashing", async () => {
    render(
      <ShareResourceModal
        resourceName="California COVID"
        resourceType="dataset"
        resourceId="dataset-id-1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Workspace access")).toBeInTheDocument();
    });

    expect(screen.getByText("People and tags")).toBeInTheDocument();
    expect(
      screen.queryByText(/Cannot read properties of undefined/i),
    ).toBeNull();
  });
});
