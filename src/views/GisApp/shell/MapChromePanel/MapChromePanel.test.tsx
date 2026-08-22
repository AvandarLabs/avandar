import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";

describe("MapChromePanel", () => {
  it("reports its expanded body and marks it hidden when collapsed", () => {
    render(
      <MapChromePanel
        variant="layers"
        id="layers"
        title="Layers"
        isCollapsed
        onToggleCollapsed={vi.fn()}
        collapseLabel="Collapse Layers"
        expandLabel="Expand Layers"
      >
        <div>Layer content</div>
      </MapChromePanel>,
    );

    const toggle = screen.getByRole("button", { name: "Expand Layers" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "layers-body");
    expect(screen.getByText("Layer content")).toBeInTheDocument();
    expect(screen.getByText("Layer content").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("exposes expanded content through the panel landmark", () => {
    render(
      <MapChromePanel
        variant="inspector"
        id="inspector"
        title="Inspector"
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
        collapseLabel="Collapse Inspector"
        expandLabel="Expand Inspector"
      >
        <div>Inspector content</div>
      </MapChromePanel>,
    );

    const toggle = screen.getByRole("button", {
      name: "Collapse Inspector",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "inspector-body");
    expect(screen.getByRole("region", { name: "Inspector" })).toHaveTextContent(
      "Inspector content",
    );
  });

  it("makes a linked body programmatically focusable", () => {
    render(
      <MapChromePanel
        variant="legend"
        id="legend"
        title="Legend"
        bodyId="legend-skip-target"
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
        collapseLabel="Collapse Legend"
        expandLabel="Expand Legend"
      >
        <div>Legend content</div>
      </MapChromePanel>,
    );

    expect(
      screen.getByRole("button", { name: "Collapse Legend" }),
    ).toHaveAttribute("aria-controls", "legend-skip-target");
    expect(document.getElementById("legend-skip-target")).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});
