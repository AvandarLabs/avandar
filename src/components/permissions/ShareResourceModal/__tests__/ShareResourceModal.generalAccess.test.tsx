import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { render, screen, waitFor } from "@/test-utils";

import {
  makeTestPublishing,
  renderShareResourceModal,
  selectGeneralAccess,
} from "./ShareResourceModal.testHelpers";
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

describe("ShareResourceModal general access", () => {
  beforeEach(() => {
    ShareResourceModalTestMocks.reset();
  });

  it("shows Only me when restricted with no non-owner share", async () => {
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
    state.sharingState = {
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

  // The dropdown's handler does two things at once: it moves the publish
  // target AND writes share rows. Delete either half and nothing else in the
  // suite notices, so these two cases pin both halves.
  it("moves the publish target and writes shares from one dropdown change", async () => {
    const onGeneralAccessChange = vi.fn();
    state.sharingState = {
      isRestricted: false,
      ownerId: "user-owner",
      shares: [],
    };
    renderShareResourceModal({
      publishing: makeTestPublishing({ onGeneralAccessChange }),
    });

    await selectGeneralAccess("Restricted");

    expect(onGeneralAccessChange).toHaveBeenCalledWith("restricted");
    expect(spies.setRestricted).toHaveBeenCalledWith(
      expect.objectContaining({ isRestricted: true, resourceId: "dash-1" }),
    );
  });

  it("moves the publish target without writing shares for the public option", async () => {
    // Public reads never consult `resource_shares`, so this option must move
    // the target and touch nothing else. Writing shares here would widen EDIT
    // access as a side effect of a READ decision.
    const onGeneralAccessChange = vi.fn();
    renderShareResourceModal({
      publishing: makeTestPublishing({ onGeneralAccessChange }),
    });

    await selectGeneralAccess("Anyone with the link");

    expect(onGeneralAccessChange).toHaveBeenCalledWith("public");
    expect(spies.upsertShare).not.toHaveBeenCalled();
    expect(spies.setRestricted).not.toHaveBeenCalled();
  });

  // The two cases below are the whole reason the pending target and the
  // persisted visibility are separate props. Read either one for both jobs and
  // exactly one of these two fails.
  it("does not warn about publication when only the pending target is public", async () => {
    // A draft someone picked "Anyone with the link" on and then thought
    // better of. Nothing has been published, so there is nothing to warn about
    // and the warning would be a lie.
    renderShareResourceModal({
      publishing: makeTestPublishing({
        targetVisibility: "public",
        currentVisibility: "draft",
      }),
    });

    await selectGeneralAccess("Only me");

    await screen.findByRole("button", { name: "Make private" });
    expect(screen.queryByText(/will still be public/)).toBeNull();
  });

  it("warns about publication for a live public resource whose target has moved off public", async () => {
    // The dangerous case: the dashboard IS public, the user has since picked
    // "Restricted", and going private now revokes shares while the whole
    // internet keeps reading it. Suppressing the warning here would be silent.
    renderShareResourceModal({
      publishing: makeTestPublishing({
        targetVisibility: "workspace",
        currentVisibility: "public",
      }),
    });

    await selectGeneralAccess("Only me");

    expect(await screen.findByText(/will still be public/)).toBeInTheDocument();
  });
});
