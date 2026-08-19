import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import {
  createBoundLayer,
  resetDataSectionFixtures,
} from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.fixtures";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";

beforeEach(() => {
  resetDataSectionFixtures();
});

describe("DataSection time column", () => {
  it("shows the time column select below the binding controls", () => {
    render(<DataSection layer={createBoundLayer()} onLayerChange={vi.fn()} />);

    expect(
      screen.getByRole("combobox", { name: "Time column" }),
    ).toBeInTheDocument();
  });

  it("hides the time column select on a buffer layer", () => {
    const source = createBoundLayer();
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Buffer"),
      source: source.source,
      geoBinding: {
        type: "bufferOfLayer",
        layerId: source.id,
        distanceMeters: 1000,
        dissolve: false,
      },
    };

    render(<DataSection layer={layer} onLayerChange={vi.fn()} />);

    expect(
      screen.queryByRole("combobox", { name: "Time column" }),
    ).not.toBeInTheDocument();
  });
});
