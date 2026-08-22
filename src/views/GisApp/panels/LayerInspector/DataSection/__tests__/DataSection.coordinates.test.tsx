import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@/test-utils";
import {
  createBoundLayer,
  createLayer,
  createXyBoundLayer,
  fixtures,
  resetDataSectionFixtures,
} from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.fixtures";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";

beforeEach(() => {
  resetDataSectionFixtures();
});

describe("DataSection coordinates", () => {
  it("infers coordinates and defaults the popup columns for an unbound layer", async () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();

    render(<DataSection layer={createLayer()} onLayerChange={onLayerChange} />);

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

  it("does not warn after a high-confidence latitude and longitude match", () => {
    fixtures.sourceColumns = [
      fixtures.latitudeColumn,
      fixtures.longitudeColumn,
    ];

    render(<DataSection layer={createBoundLayer()} onLayerChange={vi.fn()} />);

    expect(
      screen.queryByText(/matched from the column names/i),
    ).not.toBeInTheDocument();
  });

  it("warns when the match is a low-confidence x and y pair", () => {
    fixtures.sourceColumns = [fixtures.yColumn, fixtures.xColumn];

    render(
      <DataSection layer={createXyBoundLayer()} onLayerChange={vi.fn()} />,
    );

    expect(
      screen.getByText(
        "Latitude and longitude were matched from the column names y and x. Change them above if that is wrong.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert").getAttribute("style")).not.toContain(
      "#cb2717",
    );
  });

  it("dismisses the low-confidence match warning", () => {
    fixtures.sourceColumns = [fixtures.yColumn, fixtures.xColumn];

    render(
      <DataSection layer={createXyBoundLayer()} onLayerChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(
      screen.queryByText(/matched from the column names/i),
    ).not.toBeInTheDocument();
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

  it("offers a manual pick when no column name reads as a coordinate", () => {
    fixtures.sourceColumns = [fixtures.nameColumn];
    const layer = createLayer();

    render(<DataSection layer={layer} onLayerChange={vi.fn()} />);

    expect(
      screen.getByText(
        "No column in Cases was recognized as a coordinate by name. Pick the latitude and longitude columns above, or bind a geometry column instead.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Latitude" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Longitude" }),
    ).toBeInTheDocument();
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
