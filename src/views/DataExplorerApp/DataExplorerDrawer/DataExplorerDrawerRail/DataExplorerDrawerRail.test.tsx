/**
 * Tests for the drawer rail's trailing section: which control belongs to the
 * active tab, what survives collapsing, and the chevron's reported state.
 */
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render, screen } from "@/test-utils";
import { DataExplorerDrawerRail } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail";
import type { DrawerTab } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";

type Overrides = {
  activeTab?: DrawerTab;
  isCollapsed?: boolean;
  isStructuredQueryInSync?: boolean;
};

function _renderRail({
  activeTab = "query",
  isCollapsed = false,
  isStructuredQueryInSync = true,
}: Overrides = {}): void {
  render(
    <AvandarAppProvider>
      <DataExplorerDrawerRail
        activeTab={activeTab}
        isCollapsed={isCollapsed}
        regionId="drawer-region"
        queryEditorMode="manual"
        vizType="bar"
        isStructuredQueryInSync={isStructuredQueryInSync}
        onQueryEditorModeChange={vi.fn()}
        onVizTypeChange={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />
    </AvandarAppProvider>,
  );
}

describe("DataExplorerDrawerRail", () => {
  it("shows the editor-mode control on the Query tab", () => {
    _renderRail({ activeTab: "query" });

    expect(
      screen.getByRole("radiogroup", { name: /query editor mode/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /visualization type/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the chart-type control on the Visualizations tab", () => {
    _renderRail({ activeTab: "visualizations" });

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radiogroup", { name: /query editor mode/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the out-of-sync badge while shut on the Visualizations tab", () => {
    // The badge reports on the query, not on whichever editor is showing, so
    // neither collapsing nor the active tab should take it away.
    _renderRail({
      activeTab: "visualizations",
      isCollapsed: true,
      isStructuredQueryInSync: false,
    });

    expect(screen.getByText(/form is an approximation/i)).toBeInTheDocument();
  });

  it("omits the badge while the form matches the SQL", () => {
    _renderRail({ isStructuredQueryInSync: true });

    expect(
      screen.queryByText(/form is an approximation/i),
    ).not.toBeInTheDocument();
  });

  it("reports the region it controls and its expanded state", () => {
    _renderRail({ isCollapsed: true });

    const toggle = screen.getByRole("button", { name: /drawer$/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "drawer-region");
  });
});
