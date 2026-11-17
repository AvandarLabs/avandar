import { describe, expect, it, vi } from "vitest";
import { resolveAgentDashboardTarget } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import type { ResolveAgentDashboardTargetOptions } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";

const COVID = { id: "d-covid", name: "COVID 2022" };
const MORTALITY = { id: "d-mortality", name: "Mortality" };
const COVID_CASES = { id: "d-covid-cases", name: "COVID", chartCount: 1 };
const COVID_DEATHS = { id: "d-covid-deaths", name: "COVID", chartCount: 2 };

function _options(
  overrides: Partial<ResolveAgentDashboardTargetOptions>,
): ResolveAgentDashboardTargetOptions {
  return {
    requested: "COVID 2022",
    openEditorDashboardId: undefined,
    pageDashboard: undefined,
    contextDashboards: [],
    loadWorkspaceDashboards: vi
      .fn()
      .mockResolvedValue([COVID, MORTALITY, COVID_CASES, COVID_DEATHS]),
    canEdit: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("resolveAgentDashboardTarget", () => {
  it("sends current to the open editor", async () => {
    await expect(
      resolveAgentDashboardTarget(
        _options({ requested: "current", openEditorDashboardId: COVID.id }),
      ),
    ).resolves.toEqual({ kind: "editor", dashboardId: COVID.id });
  });

  it("sends current to a card for the page's dashboard with no editor open", async () => {
    await expect(
      resolveAgentDashboardTarget(
        _options({ requested: " Current ", pageDashboard: MORTALITY }),
      ),
    ).resolves.toEqual({ kind: "card", candidates: [MORTALITY] });
  });

  it("says no current dashboard on a page without one", async () => {
    await expect(
      resolveAgentDashboardTarget(_options({ requested: "current" })),
    ).resolves.toEqual({ kind: "no_current" });
  });

  it("matches a name ignoring case, spaces, and a trailing word dashboard", async () => {
    await expect(
      resolveAgentDashboardTarget(
        _options({ requested: "  covid   2022 dashboard" }),
      ),
    ).resolves.toEqual({ kind: "card", candidates: [COVID] });
  });

  it("prefers a mention over a workspace dashboard of the same name", async () => {
    const options = _options({
      requested: "COVID",
      contextDashboards: [COVID_DEATHS],
    });

    await expect(resolveAgentDashboardTarget(options)).resolves.toEqual({
      kind: "card",
      candidates: [COVID_DEATHS],
    });
    expect(options.loadWorkspaceDashboards).not.toHaveBeenCalled();
  });

  it("offers a picker when several dashboards share the name", async () => {
    await expect(
      resolveAgentDashboardTarget(_options({ requested: "COVID" })),
    ).resolves.toEqual({
      kind: "card",
      candidates: [COVID_CASES, COVID_DEATHS],
    });
  });

  it("drops matches the user cannot edit", async () => {
    const canEdit = vi.fn(async (dashboardId: string) => {
      return dashboardId !== COVID_CASES.id;
    });

    await expect(
      resolveAgentDashboardTarget(_options({ requested: "COVID", canEdit })),
    ).resolves.toEqual({ kind: "card", candidates: [COVID_DEATHS] });
  });

  it("goes to the editor when the one match is open there", async () => {
    await expect(
      resolveAgentDashboardTarget(
        _options({ openEditorDashboardId: COVID.id }),
      ),
    ).resolves.toEqual({ kind: "editor", dashboardId: COVID.id });
  });

  it("finds nothing for an unknown or uneditable name", async () => {
    await expect(
      resolveAgentDashboardTarget(_options({ requested: "Budget" })),
    ).resolves.toEqual({ kind: "not_found" });
    await expect(
      resolveAgentDashboardTarget(
        _options({ canEdit: vi.fn().mockResolvedValue(false) }),
      ),
    ).resolves.toEqual({ kind: "not_found" });
  });
});
