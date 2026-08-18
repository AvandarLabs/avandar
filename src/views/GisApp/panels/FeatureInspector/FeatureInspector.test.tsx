import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector/FeatureInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ComponentProps } from "react";

const FEATURE: GeoJSON.Feature = {
  type: "Feature",
  properties: { case_id: "case-123" },
  geometry: { type: "Point", coordinates: [0, 0] },
};

function _makePopup(urlTemplate: string): MapLayer.Popup {
  return {
    columnIds: "all",
    action: { label: "Open case", urlTemplate },
  };
}

function _renderInspector(
  props: Partial<ComponentProps<typeof FeatureInspector>> = {},
): void {
  render(
    <FeatureInspector
      opened
      onClose={() => {
        return;
      }}
      feature={FEATURE}
      popup={undefined}
      canvasRef={createRef<HTMLDivElement>()}
      {...props}
    />,
  );
}

describe("FeatureInspector", () => {
  it("presents the feature in an in-flow region rather than a dialog", () => {
    _renderInspector();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Feature" })).toBeInTheDocument();
    expect(
      screen.getByRole("separator", { name: /resize drawer/i }),
    ).toBeInTheDocument();
  });

  it("closes from the drawer header", () => {
    const onClose = vi.fn();
    _renderInspector({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders an allowed popup URL with feature values", () => {
    _renderInspector({
      popup: _makePopup("https://example.test/cases/{case_id}"),
    });

    expect(screen.getByRole("link", { name: "Open case" })).toHaveAttribute(
      "href",
      "https://example.test/cases/case-123",
    );
  });

  it("does not render a link for an unsafe popup URL", () => {
    _renderInspector({ popup: _makePopup("javascript:alert(1)") });

    expect(
      screen.queryByRole("link", { name: "Open case" }),
    ).not.toBeInTheDocument();
  });
});
