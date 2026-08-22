import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@/test-utils";

const useGetPrivateResourceCounts = vi.fn();
const useGetUsersForWorkspace = vi.fn();

vi.mock(
  "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient",
  () => {
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
  },
);

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
      useGetUsersForWorkspace,
      QueryKeys: {
        getUsersForWorkspace: () => {
          return ["users"];
        },
      },
    },
  };
});

const { PrivateResourcesPanel } = await import("./PrivateResourcesPanel");
const { ReassignOwnerModal } = await import("./ReassignOwnerModal");

const members = [
  { userId: "user-1", displayName: "Pablo", fullName: "Pablo S" },
  { userId: "user-2", displayName: "Amara", fullName: "Amara K" },
];

describe("PrivateResourcesPanel", () => {
  beforeEach(() => {
    useGetUsersForWorkspace.mockReturnValue([
      members,
      false,
      { isFetching: false },
    ]);
  });

  it("renders a row per member with their counts", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        {
          userId: "user-1",
          privateDashboardCount: 2,
          privateDatasetCount: 5,
          privateMapCount: 4,
        },
        {
          userId: "user-2",
          privateDashboardCount: 7,
          privateDatasetCount: 3,
          privateMapCount: 1,
        },
      ],
      false,
      { isFetching: false },
    ]);

    render(<PrivateResourcesPanel />);

    expect(screen.getByText("Pablo")).toBeInTheDocument();
    expect(screen.getByText("Amara")).toBeInTheDocument();
    expect(screen.getByText("Private maps")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("states plainly that content is not visible to admins", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [],
      false,
      { isFetching: false },
    ]);

    render(<PrivateResourcesPanel />);

    expect(
      screen.getByText(/never visible to workspace admins/i),
    ).toBeInTheDocument();
  });

  it("offers no reassign action for a member with nothing private", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        {
          userId: "user-1",
          privateDashboardCount: 0,
          privateDatasetCount: 0,
          privateMapCount: 0,
        },
        {
          userId: "user-2",
          privateDashboardCount: 1,
          privateDatasetCount: 0,
          privateMapCount: 0,
        },
      ],
      false,
      { isFetching: false },
    ]);

    render(<PrivateResourcesPanel />);

    expect(screen.getAllByRole("button", { name: /reassign/i })).toHaveLength(
      1,
    );
  });

  it("does not render a private-resource row without a resolved member", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        {
          userId: "user-3",
          privateDashboardCount: 1,
          privateDatasetCount: 0,
          privateMapCount: 0,
        },
      ],
      false,
      { isFetching: false },
    ]);

    render(<PrivateResourcesPanel />);

    expect(screen.queryByText("Unknown user")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reassign" })).toBeNull();
  });

  it("keeps cached private-resource data hidden during a mount refetch", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        {
          userId: "user-1",
          privateDashboardCount: 2,
          privateDatasetCount: 5,
          privateMapCount: 0,
        },
      ],
      false,
      { isFetching: true },
    ]);

    render(<PrivateResourcesPanel />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading private resources",
    );
    expect(screen.queryByText("Pablo")).not.toBeInTheDocument();
  });

  it("disables reassignment while member options are refetching", () => {
    useGetUsersForWorkspace.mockReturnValue([
      members,
      false,
      { isFetching: true },
    ]);

    render(<ReassignOwnerModal fromUserId="user-1" onClose={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "New owner" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reassign" })).toBeDisabled();
  });

  it("keeps the panel mounted while cached member names refetch", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        {
          userId: "user-1",
          privateDashboardCount: 1,
          privateDatasetCount: 0,
          privateMapCount: 0,
        },
      ],
      false,
      { isFetching: false },
    ]);
    useGetUsersForWorkspace.mockReturnValue([
      members,
      false,
      { isFetching: true },
    ]);

    render(<PrivateResourcesPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Reassign" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "New owner" })).toBeDisabled();
  });
});
