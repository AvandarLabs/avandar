import { describe, expect, it, vi } from "vitest";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { render, screen, waitFor } from "@/test-utils";

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
  it("renders the Drive-style layout with general access and owner row", async () => {
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

    // Section headings.
    expect(screen.getByText("General access")).toBeInTheDocument();
    // The summary sentence is rendered. With no shares and the resource
    // not restricted, the builder returns the general-access sentence.
    expect(
      screen.getByText(
        /This dataset is accessible to anyone with .* permission\./,
      ),
    ).toBeInTheDocument();
    // The Add combobox is present and reachable by aria-label.
    const comboboxes = screen.getAllByRole("combobox");
    expect(
      comboboxes.some((el) => {
        return el.getAttribute("aria-label") === "Add people or user groups";
      }),
    ).toBe(true);
    // Owner row shows as a non-removable badge.
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove access for John Snow/ }),
    ).toBeNull();
  });
});
