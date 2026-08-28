import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { render, screen } from "@/test-utils";
import {
  createBoundLayer,
  resetDataSectionFixtures,
} from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.fixtures";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";

beforeEach(() => {
  resetDataSectionFixtures();
});

describe("DataSection buffer of layer", () => {
  it("hides the source picker and geometry type select on a buffer layer", () => {
    const source = createBoundLayer();
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Buffer of Cases"),
      source: source.source,
      geoBinding: {
        type: "bufferOfLayer",
        layerId: source.id,
        distanceMeters: 1000,
        dissolve: false,
      },
    };

    render(
      <DataSection
        layer={layer}
        layers={[source, layer]}
        onLayerChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Source" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Geometry" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Source" })).toHaveValue(
      "Cases",
    );
    expect(
      screen.getByRole("textbox", { name: "Distance (meters)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Dissolve" }),
    ).toBeInTheDocument();
  });
});
