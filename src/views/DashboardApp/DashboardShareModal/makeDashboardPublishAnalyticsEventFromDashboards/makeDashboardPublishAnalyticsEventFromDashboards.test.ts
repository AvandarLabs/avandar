import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { makeDashboardPublishAnalyticsEventFromDashboards } from "./makeDashboardPublishAnalyticsEventFromDashboards";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardVisibility } from "$/models/Dashboard/Dashboard.types";

function _makeDashboard(
  options: Readonly<{
    isPublic?: boolean;
    slug?: string | undefined;
    blockCount?: number;
    visibility?: DashboardVisibility;
  }>,
): Dashboard.T {
  const visibility =
    options.visibility ?? (options.isPublic ? "public" : "draft");
  return Model.make("Dashboard", {
    id: "00000000-0000-4000-8000-000000000001" as Dashboard.Id,
    name: "Sales overview",
    slug: options.slug,
    description: undefined,
    isPublic: visibility === "public",
    visibility,
    isRestricted: false,
    ownerId: "00000000-0000-4000-8000-000000000002" as Dashboard.T["ownerId"],
    ownerProfileId:
      "00000000-0000-4000-8000-000000000003" as Dashboard.T["ownerProfileId"],
    workspaceId:
      "00000000-0000-4000-8000-000000000004" as Dashboard.T["workspaceId"],
    config: {
      root: { props: {} },
      content: Array.from({ length: options.blockCount ?? 0 }, () => {
        return { type: "HeadingBlock", props: {} };
      }),
    } as Dashboard.T["config"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("makeDashboardPublishAnalyticsEventFromDashboards", () => {
  it("classifies a first publication", () => {
    const previousDashboard = _makeDashboard({
      isPublic: false,
      slug: undefined,
      blockCount: 1,
    });
    const updatedDashboard = _makeDashboard({
      isPublic: true,
      slug: "sales-overview",
      blockCount: 3,
    });

    expect(
      makeDashboardPublishAnalyticsEventFromDashboards({
        previousDashboard,
        updatedDashboard,
      }),
    ).toEqual({
      event: "dashboard.published",
      payload: {
        dashboardId: updatedDashboard.id,
        blockCount: 3,
        hasVanitySlug: true,
        visibility: "public",
      },
    });
  });

  it.each([
    [undefined, "new-slug", "set"],
    ["old-slug", "new-slug", "set"],
    ["old-slug", undefined, "clear"],
    ["same-slug", "same-slug", "unchanged"],
  ] as const)(
    "classifies slug transition as %s -> %s",
    (previousSlug, updatedSlug, slugAction) => {
      const previousDashboard = _makeDashboard({
        isPublic: true,
        slug: previousSlug,
        blockCount: 2,
      });
      const updatedDashboard = _makeDashboard({
        isPublic: true,
        slug: updatedSlug,
        blockCount: 2,
      });

      expect(
        makeDashboardPublishAnalyticsEventFromDashboards({
          previousDashboard,
          updatedDashboard,
        }),
      ).toEqual({
        event: "dashboard.share_settings_updated",
        payload: {
          dashboardId: updatedDashboard.id,
          slugAction,
          visibility: "public",
        },
      });
    },
  );

  it("reports a republish of a workspace dashboard as a settings update", () => {
    // Before P2 this branched on isPublic, which is false for a workspace
    // dashboard, so every internal republish looked like a first publish.
    const event = makeDashboardPublishAnalyticsEventFromDashboards({
      previousDashboard: _makeDashboard({ visibility: "workspace" }),
      updatedDashboard: _makeDashboard({ visibility: "workspace" }),
    });
    expect(event.event).toBe("dashboard.share_settings_updated");
    expect(event.payload).toMatchObject({ visibility: "workspace" });
  });

  it("reports the first publish of a draft as a publish", () => {
    const event = makeDashboardPublishAnalyticsEventFromDashboards({
      previousDashboard: _makeDashboard({ visibility: "draft" }),
      updatedDashboard: _makeDashboard({ visibility: "public" }),
    });
    expect(event.event).toBe("dashboard.published");
    expect(event.payload).toMatchObject({ visibility: "public" });
  });
});
