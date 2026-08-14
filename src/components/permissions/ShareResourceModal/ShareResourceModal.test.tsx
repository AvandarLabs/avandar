import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { render, screen, waitFor } from "@/test-utils";

const MEMBERS = [
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
];

/**
 * Mutable query results so a test can put the member lookup back into its
 * loading state or vary the stored sharing state. Hoisted because the
 * `vi.mock` factories below read it.
 */
const mocks = vi.hoisted(() => {
  return {
    membersResult: [undefined, true] as readonly [unknown, boolean],
    sharingState: {
      isRestricted: false,
      ownerId: "user-owner",
      shares: [] as unknown[],
    },
    makeResourcePrivate: vi.fn(),
  };
});

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
        return [mocks.sharingState, false] as const;
      },
      useMakeResourcePrivate: () => {
        return [mocks.makeResourcePrivate, false] as const;
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
        return mocks.membersResult;
      },
    },
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-owner", email: "john@example.com" };
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

/**
 * Finds a rendered Mantine `Select` by its `aria-label`. Every select in the
 * modal renders as a `combobox`, so the label is the only way to tell them
 * apart.
 */
function findComboboxByLabel(label: string): HTMLElement | undefined {
  return screen.getAllByRole("combobox").find((element) => {
    return element.getAttribute("aria-label") === label;
  });
}

describe("ShareResourceModal", () => {
  beforeEach(() => {
    mocks.membersResult = [MEMBERS, false];
    mocks.sharingState = {
      isRestricted: false,
      ownerId: "user-owner",
      shares: [],
    };
    mocks.makeResourcePrivate.mockClear();
  });

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
    expect(findComboboxByLabel("Add people or user groups")).toBeDefined();
    // Owner row shows the owner's name plus a single non-removable badge.
    // Scoped to the row's `Text`: the name also appears as a combobox option.
    expect(
      screen.getByText("John Snow", { selector: "p" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove access for John Snow/ }),
    ).toBeNull();
  });

  it("waits for the member lookup before rendering the owner row", async () => {
    // While the lookup is loading there is no name to show, and the modal
    // must not fall back to a placeholder that duplicates the Owner badge.
    mocks.membersResult = [undefined, true];

    render(
      <ShareResourceModal
        resourceName="California COVID"
        resourceType="dataset"
        resourceId="dataset-id-1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Loading sharing settings…")).toBeInTheDocument();
    });
    expect(screen.queryByText("People with access")).toBeNull();
    expect(screen.queryByText("Owner")).toBeNull();
  });

  it("shows Only me when restricted with no non-owner share", async () => {
    mocks.sharingState = {
      isRestricted: true,
      ownerId: "user-owner",
      shares: [],
    };

    render(
      <ShareResourceModal
        resourceName="Q3 Revenue"
        resourceType="dashboard"
        resourceId="dash-1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(findComboboxByLabel("General access")).toHaveValue("Only me");
    });
  });

  // The workspace principal is the row a naive derivation drops. If this case
  // reads "Only me", the modal is calling a resource private that the entire
  // workspace can open.
  it("shows Restricted when restricted with a workspace share", async () => {
    mocks.sharingState = {
      isRestricted: true,
      ownerId: "user-owner",
      shares: [
        {
          id: "s-1",
          workspaceId: "workspace-id-1",
          resourceType: "dashboard",
          resourceId: "dash-1",
          principalType: "workspace",
          principalId: null,
          role: "viewer",
          requiresAppAccess: false,
        },
      ],
    };

    render(
      <ShareResourceModal
        resourceName="Q3 Revenue"
        resourceType="dashboard"
        resourceId="dash-1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(findComboboxByLabel("General access")).toHaveValue("Restricted");
    });
  });

  it("disables the add-principal row when the resource is private", async () => {
    mocks.sharingState = {
      isRestricted: true,
      ownerId: "user-owner",
      shares: [],
    };

    render(
      <ShareResourceModal
        resourceName="Q3 Revenue"
        resourceType="dashboard"
        resourceId="dash-1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(findComboboxByLabel("Add people or user groups")).toBeDisabled();
    });
  });
});
