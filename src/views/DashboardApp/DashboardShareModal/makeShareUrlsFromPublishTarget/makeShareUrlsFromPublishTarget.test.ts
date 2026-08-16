import { describe, expect, it } from "vitest";
import { makeShareUrlsFromPublishTarget } from "@/views/DashboardApp/DashboardShareModal/makeShareUrlsFromPublishTarget/makeShareUrlsFromPublishTarget";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

const dashboardId = "11111111-2222-4333-8444-555555555555" as Dashboard.Id;

describe("makeShareUrlsFromPublishTarget", () => {
  it("uses the global namespace for a public target", () => {
    expect(
      makeShareUrlsFromPublishTarget({
        workspaceSlug: "acme",
        dashboardId,
        slug: "q3-revenue",
        visibility: "public",
      }),
    ).toEqual({
      canonical: `${window.location.origin}/d/${dashboardId}`,
      vanity: `${window.location.origin}/d/q3-revenue`,
    });
  });

  it("scopes both URLs to the workspace for a workspace target", () => {
    expect(
      makeShareUrlsFromPublishTarget({
        workspaceSlug: "acme",
        dashboardId,
        slug: "q3-revenue",
        visibility: "workspace",
      }),
    ).toEqual({
      canonical: `${window.location.origin}/acme/d/${dashboardId}`,
      vanity: `${window.location.origin}/acme/d/q3-revenue`,
    });
  });

  it("returns no vanity URL without a slug", () => {
    expect(
      makeShareUrlsFromPublishTarget({
        workspaceSlug: "acme",
        dashboardId,
        slug: undefined,
        visibility: "workspace",
      }).vanity,
    ).toBeUndefined();
  });
});
