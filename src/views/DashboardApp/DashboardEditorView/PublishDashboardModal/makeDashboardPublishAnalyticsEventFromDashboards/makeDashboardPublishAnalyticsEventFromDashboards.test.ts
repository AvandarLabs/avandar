import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { makeDashboardPublishAnalyticsEventFromDashboards } from "./makeDashboardPublishAnalyticsEventFromDashboards";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

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
        },
      });
    },
  );
});
