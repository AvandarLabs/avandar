import { describe, expect, it, vi } from "vitest";
/**
 * Buffer inspector fields: read-only source, clamped distance, dissolve.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { BufferOfLayerFields } from "@/views/GisApp/panels/LayerInspector/DataSection/BufferOfLayerFields/BufferOfLayerFields";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

function _createHalfMileBufferLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Buffer of Sites"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: uuid<MapLayer.Id>(),
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

function _createBufferLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Buffer of Cases"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: uuid<MapLayer.Id>(),
      distanceMeters: MapLayer.defaultBufferDistanceMeters,
      distanceUnit: "m",
      labelColumn: undefined,
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

    const distance = screen.getByRole("textbox", { name: "Distance (m)" });
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

      fireEvent.change(screen.getByRole("textbox", { name: "Distance (m)" }), {
        target: { value },
      });

      const updatedLayer = onLayerChange.mock.calls[0]![0](layer);
      expect(updatedLayer.geoBinding).toMatchObject({
        distanceMeters: expected,
        distanceUnit: "m",
        labelColumn: undefined,
      });
    },
  );

  it("shows a buffer's distance in the unit it was typed in", () => {
    render(
      <BufferOfLayerFields
        layer={_createHalfMileBufferLayer()}
        sourceName="Sites"
        onLayerChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Distance (mi)" })).toHaveValue(
      "0.5",
    );
    expect(screen.getByText("At least 0.07 mi")).toBeInTheDocument();
  });

  it("writes a distance typed in the buffer's unit as meters", () => {
    const layer = _createHalfMileBufferLayer();
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(
      <BufferOfLayerFields
        layer={layer}
        sourceName="Sites"
        onLayerChange={onLayerChange}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Distance (mi)" }), {
      target: { value: "1" },
    });

    const updatedLayer = onLayerChange.mock.calls[0]![0](layer);
    expect(updatedLayer.geoBinding).toMatchObject({
      distanceMeters: 1609,
      distanceUnit: "mi",
    });
  });

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
