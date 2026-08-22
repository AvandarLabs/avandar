import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { render, screen, waitFor } from "@/test-utils";

import { renderShareResourceModal } from "./ShareResourceModal.testHelpers";
import { ShareResourceModalTestMocks } from "./ShareResourceModal.testMocks";

vi.mock("@/utils/notifications/notify", async () => {
  const { ShareResourceModalTestMocks: testMocks } =
    await import("./ShareResourceModal.testMocks");
  return testMocks.makeNotifyModule();
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", async () => {
  const { ShareResourceModalTestMocks: testMocks } =
    await import("./ShareResourceModal.testMocks");
  return testMocks.makeCurrentWorkspaceModule();
});

vi.mock("@/clients/permissions/ResourceShareClient", async () => {
  const { ShareResourceModalTestMocks: testMocks } =
    await import("./ShareResourceModal.testMocks");
  return testMocks.makeResourceShareClientModule();
});

vi.mock("@/clients/WorkspaceClient", async () => {
  const { ShareResourceModalTestMocks: testMocks } =
    await import("./ShareResourceModal.testMocks");
  return testMocks.makeWorkspaceClientModule();
});

vi.mock("@/hooks/users/useCurrentUser", async () => {
  const { ShareResourceModalTestMocks: testMocks } =
    await import("./ShareResourceModal.testMocks");
  return testMocks.makeCurrentUserModule();
});

vi.mock("@/clients/permissions/PermissionsClient", async () => {
  const { ShareResourceModalTestMocks: testMocks } =
    await import("./ShareResourceModal.testMocks");
  return testMocks.makePermissionsClientModule();
});

const { state, spies } = ShareResourceModalTestMocks;

describe("ShareResourceModal share rows", () => {
  beforeEach(() => {
    ShareResourceModalTestMocks.reset();
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
    expect(screen.queryByText("Share “California COVID”")).toBeNull();
  });

  it("refreshes sharing state and blocks access changes while fetching", async () => {
    state.isSharingStateFetching = true;

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
    expect(spies.getResourceSharingStateOptions).toHaveBeenCalledWith({
      workspaceId: "workspace-id-1",
      resourceType: "dataset",
      resourceId: "dataset-id-1",
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  });

  it("waits for the member lookup before rendering the owner row", async () => {
    // While the lookup is loading there is no name to show, and the modal
    // must not fall back to a placeholder that duplicates the Owner badge.
    state.membersResult = [undefined, true];

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

  it("disables the add-principal row when the resource is private", async () => {
    state.sharingState = {
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

  // The share path has no gate in front of it: adding the first non-owner
  // reader to a published, self-only dashboard is a plain PostgREST write, and
  // the entitlement trigger is where the user meets the plan limit.
  it("explains the plan limit when the database refuses the share", async () => {
    renderShareResourceModal();
    await screen.findByText(/Give access to additional members/);

    state.upsertOnError?.(
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

    expect(spies.notifyError).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Shared dashboard limit reached" }),
    );
  });

  it("keeps the generic message for any other share failure", async () => {
    renderShareResourceModal();
    await screen.findByText(/Give access to additional members/);

    state.upsertOnError?.(new Error("network unreachable"));

    expect(spies.notifyError).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Share failed" }),
    );
  });
});
