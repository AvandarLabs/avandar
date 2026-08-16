import { ModalsProvider } from "@mantine/modals";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ComponentProps } from "react";

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
    isSharingStateFetching: false,
    getResourceSharingStateOptions: vi.fn(),
    makeResourcePrivate: vi.fn(),
    setRestricted: vi.fn(),
    upsertShare: vi.fn(),
    notifyError: vi.fn(),
    /**
     * The upsert mutation's `onError`, captured so the rejection branch can be
     * driven without a real PostgREST round trip.
     */
    upsertOnError: undefined as ((error: Error) => void) | undefined,
  };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: mocks.notifyError, notifySuccess: vi.fn() };
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
      useGetResourceSharingState: (options: unknown) => {
        mocks.getResourceSharingStateOptions(options);
        return [
          mocks.sharingState,
          false,
          { isFetching: mocks.isSharingStateFetching },
        ] as const;
      },
      useMakeResourcePrivate: () => {
        return [mocks.makeResourcePrivate, false] as const;
      },
      useUpsertResourceShare: (options: {
        onError: (error: Error) => void;
      }) => {
        mocks.upsertOnError = options.onError;
        return [mocks.upsertShare, false] as const;
      },
      useDeleteResourceShare: () => {
        return [vi.fn()] as const;
      },
      useSetResourceRestricted: () => {
        return [mocks.setRestricted, false] as const;
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
 * Renders the modal with sensible defaults so a test only states what it
 * varies. The pre-existing cases keep their explicit inline `render` calls, so
 * this helper cannot silently change what they assert.
 */
function renderModal(
  overrides: Readonly<Partial<ComponentProps<typeof ShareResourceModal>>> = {},
): void {
  render(
    // `ModalsProvider` is mounted here rather than in `TestProviders` because
    // the app mounts it in the workspace layout. Without it the "Make private"
    // confirmation opens into nothing and its assertions silently pass.
    <ModalsProvider>
      <ShareResourceModal
        resourceName="Q3 Revenue"
        resourceType="dashboard"
        resourceId="dash-1"
        onClose={vi.fn()}
        {...overrides}
      />
    </ModalsProvider>,
  );
}

function _makePublishing(
  overrides: Readonly<{
    onGeneralAccessChange?: () => void;
    targetVisibility?: Dashboard.Visibility;
    currentVisibility?: Dashboard.Visibility;
  }>,
): NonNullable<ComponentProps<typeof ShareResourceModal>["publishing"]> {
  return {
    targetVisibility: overrides.targetVisibility ?? "workspace",
    currentVisibility: overrides.currentVisibility ?? "draft",
    publicOptionDisabledReason: undefined,
    section: <div data-testid="share-publishing-section" />,
    actions: <div data-testid="share-publishing-actions" />,
    onGeneralAccessChange: overrides.onGeneralAccessChange ?? vi.fn(),
  };
}

/** Opens the General access dropdown and picks an option by its label. */
async function _selectGeneralAccess(optionLabel: string): Promise<void> {
  const combobox = await screen.findByRole("combobox", {
    name: "General access",
  });
  fireEvent.click(combobox);
  fireEvent.click(await screen.findByRole("option", { name: optionLabel }));
}

describe("ShareResourceModal", () => {
  beforeEach(() => {
    mocks.membersResult = [MEMBERS, false];
    mocks.sharingState = {
      isRestricted: false,
      ownerId: "user-owner",
      shares: [],
    };
    mocks.isSharingStateFetching = false;
    mocks.getResourceSharingStateOptions.mockClear();
    mocks.makeResourcePrivate.mockClear();
    mocks.setRestricted.mockClear();
    mocks.notifyError.mockClear();
    mocks.upsertShare.mockClear();
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
    expect(
      screen.getByRole("combobox", { name: "Add people or user groups" }),
    ).toBeInTheDocument();
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

  it("refreshes sharing state and blocks access changes while fetching", async () => {
    mocks.isSharingStateFetching = true;

    render(
      <ShareResourceModal
        resourceName="California COVID"
        resourceType="dataset"
        resourceId="dataset-id-1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "General access" }),
      ).toBeDisabled();
    });
    expect(mocks.getResourceSharingStateOptions).toHaveBeenCalledWith({
      workspaceId: "workspace-id-1",
      resourceType: "dataset",
      resourceId: "dataset-id-1",
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
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
      expect(
        screen.getByRole("combobox", { name: "General access" }),
      ).toHaveValue("Only me");
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
      expect(
        screen.getByRole("combobox", { name: "General access" }),
      ).toHaveValue("Restricted");
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

    // All three controls hang off the single `isDisabled` prop, so assert the
    // whole row rather than just the principal picker.
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "Add people or user groups" }),
      ).toBeDisabled();
    });
    expect(
      screen.getByRole("combobox", { name: "Role for new share" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
  });

  it("renders no publishing section for a resource that has none", async () => {
    // Datasets pass no `publishing` prop, so the modal must render no
    // publishing UI.
    renderModal({ resourceType: "dataset" });

    await waitFor(() => {
      expect(screen.getByText("General access")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("share-publishing-section")).toBeNull();
    expect(screen.queryByTestId("share-publishing-actions")).toBeNull();
  });

  it("summarises what is published, not what the user has just picked", async () => {
    // The summary states what IS true of the resource. A draft whose owner has
    // picked "Anyone with the link" is not on the web yet, and saying it is
    // would be false reassurance. The pending change is the status alert's job
    // to report.
    renderModal({
      resourceType: "dashboard",
      publishing: _makePublishing({
        currentVisibility: "draft",
        targetVisibility: "public",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/Not published yet/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Published on the web/)).toBeNull();
  });

  it("renders the publishing section and actions when supplied", async () => {
    renderModal({
      resourceType: "dashboard",
      publishing: {
        targetVisibility: "workspace",
        currentVisibility: "draft",
        publicOptionDisabledReason: undefined,
        section: <div data-testid="share-publishing-section" />,
        actions: <div data-testid="share-publishing-actions" />,
        onGeneralAccessChange: vi.fn(),
      },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("share-publishing-section"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("share-publishing-actions")).toBeInTheDocument();
  });

  // The dropdown's handler does two things at once: it moves the publish
  // target AND writes share rows. Delete either half and nothing else in the
  // suite notices, so these two cases pin both halves.
  it("moves the publish target and writes shares from one dropdown change", async () => {
    const onGeneralAccessChange = vi.fn();
    mocks.sharingState = {
      isRestricted: false,
      ownerId: "user-owner",
      shares: [],
    };
    renderModal({ publishing: _makePublishing({ onGeneralAccessChange }) });

    await _selectGeneralAccess("Restricted");

    expect(onGeneralAccessChange).toHaveBeenCalledWith("restricted");
    expect(mocks.setRestricted).toHaveBeenCalledWith(
      expect.objectContaining({ isRestricted: true, resourceId: "dash-1" }),
    );
  });

  it("moves the publish target without writing shares for the public option", async () => {
    // Public reads never consult `resource_shares`, so this option must move
    // the target and touch nothing else. Writing shares here would widen EDIT
    // access as a side effect of a READ decision.
    const onGeneralAccessChange = vi.fn();
    renderModal({ publishing: _makePublishing({ onGeneralAccessChange }) });

    await _selectGeneralAccess("Anyone with the link");

    expect(onGeneralAccessChange).toHaveBeenCalledWith("public");
    expect(mocks.upsertShare).not.toHaveBeenCalled();
    expect(mocks.setRestricted).not.toHaveBeenCalled();
  });

  // The two cases below are the whole reason the pending target and the
  // persisted visibility are separate props. Read either one for both jobs and
  // exactly one of these two fails.
  it("does not warn about publication when only the pending target is public", async () => {
    // A draft someone picked "Anyone with the link" on and then thought
    // better of. Nothing has been published, so there is nothing to warn about
    // and the warning would be a lie.
    renderModal({
      publishing: _makePublishing({
        targetVisibility: "public",
        currentVisibility: "draft",
      }),
    });

    await _selectGeneralAccess("Only me");

    await screen.findByRole("button", { name: "Make private" });
    expect(screen.queryByText(/will still be public/)).toBeNull();
  });

  it("warns about publication for a live public resource whose target has moved off public", async () => {
    // The dangerous case: the dashboard IS public, the user has since picked
    // "Restricted", and going private now revokes shares while the whole
    // internet keeps reading it. Suppressing the warning here would be silent.
    renderModal({
      publishing: _makePublishing({
        targetVisibility: "workspace",
        currentVisibility: "public",
      }),
    });

    await _selectGeneralAccess("Only me");

    expect(await screen.findByText(/will still be public/)).toBeInTheDocument();
  });

  // The share path has no gate in front of it: adding the first non-owner
  // reader to a published, self-only dashboard is a plain PostgREST write, and
  // the entitlement trigger is where the user meets the plan limit.
  it("explains the plan limit when the database refuses the share", async () => {
    renderModal();
    await screen.findByText(/Give access to additional members/);

    mocks.upsertOnError?.(
      Object.assign(
        new Error(
          "This workspace's plan allows 1 shared or public dashboard(s)",
        ),
        {
          name: "PostgrestError",
          code: "42501",
          details: null,
          hint: "shareable_dashboard_limit",
        },
      ),
    );

    expect(mocks.notifyError).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Shared dashboard limit reached" }),
    );
  });

  it("keeps the generic message for any other share failure", async () => {
    renderModal();
    await screen.findByText(/Give access to additional members/);

    mocks.upsertOnError?.(new Error("network unreachable"));

    expect(mocks.notifyError).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Share failed" }),
    );
  });
});
