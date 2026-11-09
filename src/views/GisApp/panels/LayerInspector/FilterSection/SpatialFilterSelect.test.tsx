import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { SpatialFilterSelect } from "@/views/GisApp/panels/LayerInspector/FilterSection/SpatialFilterSelect";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

function _makePointLayer(name: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty(name),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea(`Buffer of ${source.name}`),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

describe("SpatialFilterSelect", () => {
  it("offers only other layers that output polygons", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _makePointLayer("Schools");
    render(
      <SpatialFilterSelect
        layer={schools}
        layers={[sites, buffer, schools]}
        onLayerChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("combobox", { name: "Only show features inside" }),
    );

    expect(
      screen.getAllByRole("option", { hidden: true }).map((option) => {
        return option.textContent;
      }),
    ).toEqual(["Buffer of Sites"]);
  });

  it("filters the layer by the picked area layer", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _makePointLayer("Schools");
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(
      <SpatialFilterSelect
        layer={schools}
        layers={[sites, buffer, schools]}
        onLayerChange={onLayerChange}
      />,
    );

    pickMantineSelectOption("Only show features inside", "Buffer of Sites");

    const update = onLayerChange.mock.calls[0]![0];
    expect(update(schools).spatialFilter).toEqual({ layerId: buffer.id });
  });
});
