import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

const { dashboardClientState, logEventMock } = vi.hoisted(() => {
  return {
    dashboardClientState: {
      currentUpdatedDashboard: undefined as Dashboard.T | undefined,
    },
    logEventMock: vi.fn(),
  };
});

vi.mock("@/clients/dashboards/DashboardClient", () => {
  return {
    DashboardClient: {
      usePublishDashboard: (options: {
        onSuccess: (dashboard: Dashboard.T) => void;
      }): [(input: unknown) => void, boolean] => {
        return [
          () => {
            if (dashboardClientState.currentUpdatedDashboard) {
              options.onSuccess(dashboardClientState.currentUpdatedDashboard);
            }
          },
          false,
        ];
      },
      useValidateDashboardSlug: (): [(input: unknown) => void, boolean] => {
        return [vi.fn(), false];
      },
    },
  };
});

vi.mock(
  "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder",
  () => {
    return {
      DashboardSliceBuilder: {
        readDashboardPublishConfig: (): { slices: Record<string, unknown> } => {
          return { slices: {} };
        },
      },
    };
  },
);

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: (): { slug: string } => {
      return { slug: "test-workspace" };
    },
  };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return {
    AnalyticsClient: { logEvent: logEventMock },
  };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: vi.fn(), notifySuccess: vi.fn() };
});

vi.mock(
  "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModalContent",
  () => {
    return {
      PublishDashboardModalContent: ({
        onSlugInputChange,
        onSubmit,
      }: {
        onSlugInputChange: (slug: string) => void;
        onSubmit: () => void;
      }): React.JSX.Element => {
        return (
          <>
            <button
              onClick={() => {
                onSlugInputChange("");
              }}
            >
              Clear slug
            </button>
            <button onClick={onSubmit}>Submit publish</button>
          </>
        );
      },
    };
  },
);

const { PublishDashboardModal } =
  await import("@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal");

function _makeDashboard(options: {
  isPublic: boolean;
  slug: string | undefined;
  blockCount: number;
}): Dashboard.T {
  return Model.make("Dashboard", {
    id: "00000000-0000-4000-8000-000000000001" as Dashboard.Id,
    name: "Sales overview",
    slug: options.slug,
    description: undefined,
    isPublic: options.isPublic,
    visibility: options.isPublic ? "public" : "draft",
    isRestricted: false,
    ownerId: "00000000-0000-4000-8000-000000000002" as Dashboard.T["ownerId"],
    ownerProfileId:
      "00000000-0000-4000-8000-000000000003" as Dashboard.T["ownerProfileId"],
    workspaceId:
      "00000000-0000-4000-8000-000000000004" as Dashboard.T["workspaceId"],
    config: {
      root: { props: {} },
      content: Array.from({ length: options.blockCount }, () => {
        return { type: "HeadingBlock", props: {} };
      }),
    } as Dashboard.T["config"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("PublishDashboardModal", () => {
  beforeEach(() => {
    dashboardClientState.currentUpdatedDashboard = undefined;
    logEventMock.mockReset();
  });

  it("emits exactly one publication event", () => {
    dashboardClientState.currentUpdatedDashboard = _makeDashboard({
      isPublic: true,
      slug: "sales",
      blockCount: 2,
    });
    render(
      <PublishDashboardModal
        dashboard={_makeDashboard({
          isPublic: false,
          slug: undefined,
          blockCount: 2,
        })}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit publish" }));

    expect(logEventMock).toHaveBeenCalledOnce();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "dashboard.published",
      workspaceId: dashboardClientState.currentUpdatedDashboard.workspaceId,
      app: "dashboards",
      payload: {
        dashboardId: dashboardClientState.currentUpdatedDashboard.id,
        blockCount: 2,
        hasVanitySlug: true,
      },
    });
  });

  it("emits exactly one share-update event for a public dashboard", () => {
    dashboardClientState.currentUpdatedDashboard = _makeDashboard({
      isPublic: true,
      slug: undefined,
      blockCount: 2,
    });
    render(
      <PublishDashboardModal
        dashboard={_makeDashboard({
          isPublic: true,
          slug: "sales",
          blockCount: 2,
        })}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear slug" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit publish" }));

    expect(logEventMock).toHaveBeenCalledOnce();
    expect(logEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "dashboard.share_settings_updated",
        payload: expect.objectContaining({ slugAction: "clear" }),
      }),
    );
  });
});
