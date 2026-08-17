import {
  createBoundLayer,
  createLayer,
  fixtures,
  resetDataSectionFixtures,
} from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

beforeEach(() => {
  resetDataSectionFixtures();
});

describe("DataSection coordinates", () => {
  it("infers coordinates and defaults the popup columns for an unbound layer", async () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();

    render(
      <DataSection layer={createLayer()} onLayerChange={onLayerChange} />,
    );

    await waitFor(() => {
      expect(onLayerChange).toHaveBeenCalledOnce();
    });

    const update = onLayerChange.mock.calls[0]![0];
    const updatedLayer = update(createLayer());
    expect(updatedLayer.geoBinding).toEqual({
      type: "latLngColumns",
      latitude: fixtures.latitudeColumn.id,
      longitude: fixtures.longitudeColumn.id,
    });
    expect(updatedLayer.popup.columnIds).toEqual([
      fixtures.latitudeColumn.id,
      fixtures.longitudeColumn.id,
    ]);
  });

  it("explains which columns were matched after a binding is present", () => {
    fixtures.sourceColumns = [
      fixtures.latitudeColumn,
      fixtures.longitudeColumn,
    ];

    render(<DataSection layer={createBoundLayer()} onLayerChange={vi.fn()} />);

    expect(
      screen.getByText(
        "Latitude and longitude were matched from the column names Lat and Long_. Change them above if that is wrong.",
      ),
    ).toBeInTheDocument();
  });

  it("does not infer a missing axis when the other axis is already bound", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = {
      ...createLayer(),
      source: {
        ...createLayer().source,
        queryColumns: [fixtures.latitudeColumn],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: fixtures.latitudeColumn.id,
        longitude: undefined,
      },
    };

    render(<DataSection layer={layer} onLayerChange={onLayerChange} />);

    expect(onLayerChange).not.toHaveBeenCalled();
  });

  it("explains when a selected source has no coordinate columns", () => {
    fixtures.sourceColumns = [fixtures.nameColumn];
    const layer = createLayer();

    render(<DataSection layer={layer} onLayerChange={vi.fn()} />);

    expect(
      screen.getByText(
        "No column in Cases holds coordinates. Boundary joins arrive in a later release, so pick a different source.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Latitude" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Longitude" }),
    ).not.toBeInTheDocument();
  });

  it("updates a coordinate binding when a coordinate column changes", () => {
    fixtures.sourceColumns = [
      fixtures.latitudeColumn,
      fixtures.longitudeColumn,
    ];
    const onLayerChange = vi.fn<LayerChangeHandler>();

    render(
      <DataSection layer={createBoundLayer()} onLayerChange={onLayerChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Latitude" }));

    expect(onLayerChange).toHaveBeenCalledOnce();
    const update = onLayerChange.mock.calls[0]![0];
    const updatedLayer = update(createBoundLayer());
    expect(updatedLayer.geoBinding?.type).toBe("latLngColumns");
    if (updatedLayer.geoBinding?.type !== "latLngColumns") {
      return;
    }
    expect(updatedLayer.geoBinding.latitude).toBe(fixtures.latitudeColumn.id);
  });

});
