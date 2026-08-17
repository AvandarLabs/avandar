import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PublishingSection } from "@/views/DashboardApp/DashboardShareModal/PublishingSection";
import type { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useDashboardPublishingControl";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

vi.mock(
  "@/views/DashboardApp/DashboardShareModal/PublishDashboardStatus/PublishDashboardStatus",
  () => {
    return {
      PublishDashboardStatus: () => {
        return null;
      },
    };
  },
);

vi.mock(
  "@/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField",
  () => {
    return {
      VanitySlugField: () => {
        return <div>Custom URL (optional)</div>;
      },
    };
  },
);

vi.mock(
  "@/views/DashboardApp/DashboardShareModal/PublishSliceSection/PublishSliceSection",
  () => {
    return {
      PublishSliceSection: () => {
        return <div>Data scope</div>;
      },
    };
  },
);

function _makePublishing(
  visibility: Dashboard.Visibility = "draft",
): ReturnType<typeof useDashboardPublishingControl> {
  return {
    currentDashboard: { id: "dash-1", visibility } as Dashboard.T,
    targetVisibility: visibility === "draft" ? "workspace" : visibility,
    actionKind: "publish_workspace",
    isBusy: false,
    shareUrls: {
      vanity: "https://example.test/d/first-dash",
      canonical: "https://example.test/d/dash-1",
      pathPrefix: "https://example.test/d/",
    },
    slugInput: "first-dash",
    normalisedSlug: "first-dash",
    hasPendingSlugCheck: false,
    isSlugAccepted: true,
    isSlugRejected: false,
    slugErrorMessage: undefined,
    onSlugInputChange: vi.fn(),
    publishConfig: { slices: {} },
    onPublishConfigChange: vi.fn(),
    onGeneralAccessChange: vi.fn(),
    onPrimaryAction: vi.fn(),
  } as ReturnType<typeof useDashboardPublishingControl>;
}

describe("PublishingSection", () => {
  it("hides data scope inside a collapsed Advanced options accordion", async () => {
    render(<PublishingSection publishing={_makePublishing()} />);

    expect(
      screen.getByRole("button", { name: "Advanced options" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Data scope")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Advanced options" }));

    expect(await screen.findByText("Data scope")).toBeInTheDocument();
  });

  it("does not show a direct link before the dashboard is published", () => {
    render(<PublishingSection publishing={_makePublishing("draft")} />);

    expect(screen.queryByText("Direct link")).toBeNull();
  });

  it("does not show a Direct link row after publish", () => {
    render(<PublishingSection publishing={_makePublishing("workspace")} />);

    expect(screen.queryByText("Direct link")).toBeNull();
  });

  it("keeps the standalone custom URL field before publish", () => {
    render(<PublishingSection publishing={_makePublishing("draft")} />);

    expect(screen.getByText("Custom URL (optional)")).toBeInTheDocument();
  });

  it("hides the standalone custom URL field after publish", () => {
    render(<PublishingSection publishing={_makePublishing("workspace")} />);

    expect(screen.queryByText("Custom URL (optional)")).toBeNull();
  });
});
