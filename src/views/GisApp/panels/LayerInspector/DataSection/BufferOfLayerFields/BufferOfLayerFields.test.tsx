/**
 * Buffer inspector fields: read-only source, clamped distance, dissolve.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { BufferOfLayerFields } from "@/views/GisApp/panels/LayerInspector/DataSection/BufferOfLayerFields/BufferOfLayerFields";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

function _createBufferLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Buffer of Cases"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: uuid<MapLayer.Id>(),
      distanceMeters: MapLayer.defaultBufferDistanceMeters,
      dissolve: false,
    },
  };
}

describe("BufferOfLayerFields", () => {
  it("shows a read-only source name with clamped distance and dissolve", () => {
    render(
      <BufferOfLayerFields
        layer={_createBufferLayer()}
        sourceName="Cases"
        onLayerChange={vi.fn()}
      />,
    );

    const source = screen.getByRole("textbox", { name: "Source" });
    expect(source).toHaveValue("Cases");
    expect(source).toHaveAttribute("readonly");

    const distance = screen.getByRole("textbox", { name: "Distance (meters)" });
    expect(distance).toHaveValue("1000");

    expect(screen.getByRole("switch", { name: "Dissolve" })).not.toBeChecked();
  });

  it.each([
    { value: "50", expected: 100 },
    { value: "2000000", expected: 1_000_000 },
  ])(
    "writes a $expected m distance when the input is $value",
    ({ value, expected }) => {
      const layer = _createBufferLayer();
      const onLayerChange = vi.fn<LayerChangeHandler>();
      render(
        <BufferOfLayerFields
          layer={layer}
          sourceName="Cases"
          onLayerChange={onLayerChange}
        />,
      );

      fireEvent.change(
        screen.getByRole("textbox", { name: "Distance (meters)" }),
        { target: { value } },
      );

      const updatedLayer = onLayerChange.mock.calls[0]![0](layer);
      expect(updatedLayer.geoBinding).toMatchObject({
        distanceMeters: expected,
      });
    },
  );

  it("writes dissolve through the layer updater", () => {
    const layer = _createBufferLayer();
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(
      <BufferOfLayerFields
        layer={layer}
        sourceName="Cases"
        onLayerChange={onLayerChange}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Dissolve" }));

    const updatedLayer = onLayerChange.mock.calls[0]![0](layer);
    expect(updatedLayer.geoBinding).toMatchObject({ dissolve: true });
  });
});
