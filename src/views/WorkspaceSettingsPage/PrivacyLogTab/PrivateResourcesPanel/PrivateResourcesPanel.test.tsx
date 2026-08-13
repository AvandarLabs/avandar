import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";

const useGetPrivateResourceCounts = vi.fn();

vi.mock("@/clients/permissions/PrivateResourceAdminClient", () => {
  return {
    PrivateResourceAdminClient: {
      useGetPrivateResourceCounts,
      useTransferAllOwnedResources: () => {
        return [vi.fn(), false];
      },
      QueryKeys: {
        getPrivateResourceCounts: () => {
          return ["private-resource-counts"];
        },
      },
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", name: "Acme", slug: "acme", ownerId: "user-1" };
    },
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      useGetUsersForWorkspace: () => {
        return [
          [
            { userId: "user-1", displayName: "Pablo", fullName: "Pablo S" },
            { userId: "user-2", displayName: "Amara", fullName: "Amara K" },
          ],
          false,
        ];
      },
      QueryKeys: {
        getUsersForWorkspace: () => {
          return ["users"];
        },
      },
    },
  };
});

const { PrivateResourcesPanel } = await import("./PrivateResourcesPanel");

describe("PrivateResourcesPanel", () => {
  it("renders a row per member with their counts", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        { userId: "user-1", privateDashboardCount: 2, privateDatasetCount: 5 },
        { userId: "user-2", privateDashboardCount: 7, privateDatasetCount: 3 },
      ],
      false,
    ]);

    render(<PrivateResourcesPanel />);

    expect(screen.getByText("Pablo")).toBeInTheDocument();
    expect(screen.getByText("Amara")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("states plainly that content is not visible to admins", () => {
    useGetPrivateResourceCounts.mockReturnValue([[], false]);

    render(<PrivateResourcesPanel />);

    expect(
      screen.getByText(/never visible to workspace admins/i),
    ).toBeInTheDocument();
  });

  it("offers no reassign action for a member with nothing private", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        { userId: "user-1", privateDashboardCount: 0, privateDatasetCount: 0 },
        { userId: "user-2", privateDashboardCount: 1, privateDatasetCount: 0 },
      ],
      false,
    ]);

    render(<PrivateResourcesPanel />);

    expect(screen.getAllByRole("button", { name: /reassign/i })).toHaveLength(
      1,
    );
  });
});
