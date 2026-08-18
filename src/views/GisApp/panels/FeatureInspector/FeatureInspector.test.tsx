import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector/FeatureInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

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

describe("FeatureInspector", () => {
  it("renders an allowed popup URL with feature values", () => {
    render(
      <FeatureInspector
        opened
        onClose={() => {
          return;
        }}
        feature={FEATURE}
        popup={_makePopup("https://example.test/cases/{case_id}")}
      />,
    );

    expect(screen.getByRole("link", { name: "Open case" })).toHaveAttribute(
      "href",
      "https://example.test/cases/case-123",
    );
  });

  it("does not render a link for an unsafe popup URL", () => {
    render(
      <FeatureInspector
        opened
        onClose={() => {
          return;
        }}
        feature={FEATURE}
        popup={_makePopup("javascript:alert(1)")}
      />,
    );

    expect(
      screen.queryByRole("link", { name: "Open case" }),
    ).not.toBeInTheDocument();
  });
});
