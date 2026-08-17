import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { MapShell } from "@/views/GisApp/shell/MapShell/MapShell";

function _renderMapShell(isChromeHidden = false): void {
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
    _renderMapShell(true);

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
});
