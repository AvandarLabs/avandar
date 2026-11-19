/**
 * Tests for the per-type gadget summary hooks. Every client hook is mocked,
 * so each case controls exactly what the lookups return.
 */
import { describe, expect, it } from "vitest";
import { GadgetSummariesTestFixtures } from "./useGadgetSummariesTestFixtures";

const {
  useDashboardSummary,
  useDashboardTileSummary,
  mocks,
  OTHER_WORKSPACE_ID,
  DASHBOARD_ID,
  UPDATED_LABEL,
  DASHBOARD,
  _ref,
  _renderSummary,
  _factPairs,
} = GadgetSummariesTestFixtures;

describe("useDashboardSummary", () => {
  it("summarizes a dashboard that the reader can open", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    const summary = _renderSummary(
      useDashboardSummary,
      _ref("dashboard", DASHBOARD_ID),
    );
    expect(summary).toMatchObject({
      status: "available",
      name: "Measles by borough",
      link: {
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
      },
    });
    expect(_factPairs(summary)).toEqual([
      ["Tiles", "3"],
      ["Audience", "Workspace"],
      ["Updated", UPDATED_LABEL],
    ]);
  });

  it("is loading while the dashboard is fetched", () => {
    mocks.useDashboardById.mockReturnValue([undefined, true]);
    expect(
      _renderSummary(useDashboardSummary, _ref("dashboard", DASHBOARD_ID)),
    ).toEqual({ status: "loading" });
  });

  it("is unavailable for a dashboard in another workspace", () => {
    mocks.useDashboardById.mockReturnValue([
      { ...DASHBOARD, workspaceId: OTHER_WORKSPACE_ID },
      false,
    ]);
    expect(
      _renderSummary(useDashboardSummary, _ref("dashboard", DASHBOARD_ID)),
    ).toEqual({ status: "unavailable" });
  });

  it("is unavailable when no dashboard row comes back", () => {
    expect(
      _renderSummary(useDashboardSummary, _ref("dashboard", DASHBOARD_ID)),
    ).toEqual({ status: "unavailable" });
  });
});

describe("useDashboardTileSummary", () => {
  it("names a tile after its prompt and links to it on the dashboard", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    const summary = _renderSummary(
      useDashboardTileSummary,
      _ref("dashboard_tile", DASHBOARD_ID, "DataViz-top"),
    );
    expect(summary).toMatchObject({
      status: "available",
      name: "Weekly cases",
      link: {
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
        search: { tile: "DataViz-top" },
      },
    });
    expect(_factPairs(summary)).toEqual([
      ["Dashboard", "Measles by borough"],
      ["Chart", "Line Chart"],
      ["Updated", UPDATED_LABEL],
    ]);
  });

  it("names a tile without a prompt Untitled chart", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    const summary = _renderSummary(
      useDashboardTileSummary,
      _ref("dashboard_tile", DASHBOARD_ID, "DataViz-nested"),
    );
    expect(summary).toMatchObject({
      status: "available",
      name: "Untitled chart",
      link: { search: { tile: "DataViz-nested" } },
    });
  });

  it("omits the Chart fact for a viz type this build does not know", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    const summary = _renderSummary(
      useDashboardTileSummary,
      _ref("dashboard_tile", DASHBOARD_ID, "DataViz-future"),
    );
    expect(_factPairs(summary)).toEqual([
      ["Dashboard", "Measles by borough"],
      ["Updated", UPDATED_LABEL],
    ]);
  });

  it("is unavailable for a tile of a dashboard in another workspace", () => {
    mocks.useDashboardById.mockReturnValue([
      { ...DASHBOARD, workspaceId: OTHER_WORKSPACE_ID },
      false,
    ]);
    expect(
      _renderSummary(
        useDashboardTileSummary,
        _ref("dashboard_tile", DASHBOARD_ID, "DataViz-top"),
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("is unavailable when the ref names no tile", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    expect(
      _renderSummary(
        useDashboardTileSummary,
        _ref("dashboard_tile", DASHBOARD_ID, null),
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("is unavailable when the dashboard no longer holds the tile", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    expect(
      _renderSummary(
        useDashboardTileSummary,
        _ref("dashboard_tile", DASHBOARD_ID, "DataViz-gone"),
      ),
    ).toEqual({ status: "unavailable" });
  });
});
