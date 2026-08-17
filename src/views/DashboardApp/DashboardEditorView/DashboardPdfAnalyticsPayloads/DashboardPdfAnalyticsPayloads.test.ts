/**
 * Block count is what makes an export duration interpretable: a slow export of
 * two blocks and a slow export of forty are different problems.
 */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { DashboardPdfAnalyticsPayloads } from "@/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

function _makeDashboard(blockCount: number): Dashboard.T {
  return Model.make("Dashboard", {
    id: "00000000-0000-4000-8000-000000000001" as Dashboard.Id,
    name: "Quarterly",
    slug: undefined,
    description: undefined,
    isPublic: false,
    // Unpublished, matching `isPublic: false` and the absent slug. Export is
    // reachable from the editor regardless of publication state.
    visibility: "draft",
    isRestricted: false,
    ownerId: "00000000-0000-4000-8000-000000000002" as Dashboard.T["ownerId"],
    ownerProfileId:
      "00000000-0000-4000-8000-000000000003" as Dashboard.T["ownerProfileId"],
    workspaceId:
      "00000000-0000-4000-8000-000000000004" as Dashboard.T["workspaceId"],
    config: {
      root: { props: {} },
      content: Array.from({ length: blockCount }, (_unused, index) => {
        return { type: "DataViz", props: { id: `block-${index}` } };
      }),
    } as Dashboard.T["config"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("DashboardPdfAnalyticsPayloads", () => {
  it("counts the blocks on the dashboard being opened for export", () => {
    expect(
      DashboardPdfAnalyticsPayloads.fromExportOpened(_makeDashboard(4)),
    ).toEqual({
      dashboardId: "00000000-0000-4000-8000-000000000001",
      blockCount: 4,
    });
  });

  it("reports zero blocks for an empty dashboard rather than omitting the count", () => {
    expect(
      DashboardPdfAnalyticsPayloads.fromExportOpened(_makeDashboard(0))
        .blockCount,
    ).toBe(0);
  });

  it("reports zero blocks when the stored config carries no content at all", () => {
    // A config is JSON, so nothing guarantees a `content` key is present. The
    // count has to fall back to zero rather than throw: this runs after the
    // file is already saved, and the export's own catch would turn a throw
    // here into a "your export failed" message for an export that succeeded.
    const dashboard = {
      ..._makeDashboard(3),
      config: { root: { props: {} } } as Dashboard.T["config"],
    };

    expect(
      DashboardPdfAnalyticsPayloads.fromExportOpened(dashboard).blockCount,
    ).toBe(0);
  });

  it("rounds the export duration", () => {
    expect(
      DashboardPdfAnalyticsPayloads.fromExported({
        dashboard: _makeDashboard(2),
        durationMs: 1840.7,
        mode: "direct",
      }),
    ).toEqual({
      dashboardId: "00000000-0000-4000-8000-000000000001",
      blockCount: 2,
      durationMs: 1841,
      mode: "direct",
    });
  });
});
