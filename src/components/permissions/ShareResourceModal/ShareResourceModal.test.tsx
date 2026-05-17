import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import * as featureFlags from "@/utils/featureFlags";
import { render } from "@/utils/testing-utils";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return {
        id: "workspace-id-1",
        slug: "test-workspace",
        name: "Test Workspace",
        ownerId: "user-owner",
      };
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
            ownerId: "user-owner",
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
              userId: "user-owner",
              displayName: "John Snow",
              fullName: "John Snow",
              email: "john@example.com",
            },
            {
              userId: "user-1",
              displayName: "Alice",
              fullName: "Alice Example",
              email: "alice@example.com",
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
  it("renders the v1 layout when SHARE_MODAL_V2 is disabled (default)", async () => {
    // No mock — the flag is off by default; the v1 modal should render.
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

  it("renders the v2 layout when SHARE_MODAL_V2 is enabled", async () => {
    const spy = vi
      .spyOn(featureFlags, "isShareModalV2Enabled")
      .mockReturnValue(true);

    try {
      render(
        <ShareResourceModal
          resourceName="California COVID"
          resourceType="dataset"
          resourceId="dataset-id-1"
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("People with access")).toBeInTheDocument();
      });

      // v2 sections.
      expect(screen.getByText("General access")).toBeInTheDocument();
      // The summary sentence is rendered. With no shares + no workspace
      // share, the builder returns the owner-only fallback sentence.
      expect(
        screen.getByText(
          /This dataset is currently only accessible to its owner./,
        ),
      ).toBeInTheDocument();
      // The Add combobox is present and reachable by aria-label.
      const comboboxes = screen.getAllByRole("combobox");
      expect(
        comboboxes.some((el) => {
          return (
            el.getAttribute("aria-label") === "Add people, groups, or tags"
          );
        }),
      ).toBe(true);
      // Owner row shows as a non-removable badge.
      expect(screen.getByText("Owner")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Remove access for John Snow/ }),
      ).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
