import { beforeEach, describe, expect, it, vi } from "vitest";

import { screen, waitFor } from "@/test-utils";

import {
  makeTestPublishing,
  renderShareResourceModal,
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

describe("ShareResourceModal publishing prop", () => {
  beforeEach(() => {
    ShareResourceModalTestMocks.reset();
  });

  it("renders no publishing section for a resource that has none", async () => {
    // Datasets pass no `publishing` prop, so the modal must render no
    // publishing UI.
    renderShareResourceModal({ resourceType: "dataset" });

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
    renderShareResourceModal({
      resourceType: "dashboard",
      publishing: makeTestPublishing({
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
    renderShareResourceModal({
      resourceType: "dashboard",
      publishing: makeTestPublishing({
        targetVisibility: "workspace",
        currentVisibility: "draft",
      }),
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("share-publishing-section"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("share-publishing-actions")).toBeInTheDocument();
  });
});
