import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { MapShell } from "@/views/GisApp/shell/MapShell/MapShell";
import type { ReactNode } from "react";

function _renderMapShell(
  options: { isChromeHidden?: boolean; featureDrawer?: ReactNode } = {},
): void {
  const { isChromeHidden = false, featureDrawer } = options;
  render(
    <MapShell
      canvas={<div data-testid="canvas">Canvas</div>}
      topBar={<div data-testid="top-bar-content">Top bar</div>}
      layerPanel={<div data-testid="layer-panel">Layer panel</div>}
      inspector={<div data-testid="inspector">Inspector</div>}
      legend={<div data-testid="legend">Legend</div>}
      toolCluster={<div data-testid="tool-cluster">Tools</div>}
      statusCard={<div data-testid="status-card">Status</div>}
      furnitureBar={<div data-testid="furniture-bar">Furniture</div>}
      firstRunCard={<div data-testid="first-run-card">First run</div>}
      featureDrawer={featureDrawer}
      mapLabel="Map of Cholera response"
      isChromeHidden={isChromeHidden}
      topBarRef={() => {
        return undefined;
      }}
      leftColumnRef={() => {
        return undefined;
      }}
      rightColumnRef={() => {
        return undefined;
      }}
    />,
  );
}

describe("MapShell", () => {
  it("exposes one named map region without application semantics", () => {
    _renderMapShell();

    expect(
      screen.getByRole("region", {
        name: "Map of Cholera response. Use the layer panel to change what is shown.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
  });

  it("shows skip links when chrome is visible", () => {
    _renderMapShell();

    expect(
      screen.getByRole("link", { name: "Skip to layer settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Skip to map tools" }),
    ).toBeInTheDocument();
  });

  it("announces the small-screen read-only notice with its exact copy", () => {
    _renderMapShell();

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(
      "Viewing only on this screen size. Pan, zoom and tap a feature to read it. To edit layers, open this map on a tablet or a laptop.",
    );
  });

  it("keeps only the map and furniture visible when chrome is hidden", () => {
    _renderMapShell({ isChromeHidden: true });

    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByTestId("furniture-bar")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Skip to layer settings" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Skip to map tools" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("top-bar-content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("layer-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("inspector")).not.toBeInTheDocument();
    expect(screen.queryByTestId("legend")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tool-cluster")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("first-run-card")).not.toBeInTheDocument();
  });

  it("docks the feature drawer under the map so chrome stays on the canvas", () => {
    _renderMapShell({
      featureDrawer: <div data-testid="feature-drawer">Drawer</div>,
    });

    const mapRegion = screen.getByRole("region", {
      name: "Map of Cholera response. Use the layer panel to change what is shown.",
    });
    const drawer = screen.getByTestId("feature-drawer");
    const furniture = screen.getByTestId("furniture-bar");

    expect(mapRegion).toContainElement(screen.getByTestId("tool-cluster"));
    expect(mapRegion).not.toContainElement(drawer);
    expect(mapRegion.parentElement).toContainElement(drawer);
    expect(
      drawer.compareDocumentPosition(furniture) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
