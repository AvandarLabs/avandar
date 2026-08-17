import {
  applyLatestUpdate,
  queryColumn,
} from "@/views/GisApp/panels/LayerInspector/StyleSection/__tests__/StyleSection.fixtures";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { StyleSection } from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection";

describe("StyleSection paint controls", () => {
  it("restores the previous point settings after switching from sized", () => {
    const onLayerChange = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");

    const { rerender } = render(
      <StyleSection layer={layer} onLayerChange={onLayerChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sized" }));
    const sizedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });
    rerender(<StyleSection layer={sizedLayer} onLayerChange={onLayerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Point" }));
    const restoredLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: sizedLayer,
    });

    expect(restoredLayer.symbology).toEqual(layer.symbology);
  });

  it("uses a selected query column when switching from point to sized", () => {
    const onLayerChange = vi.fn();
    const emptyLayer = MapLayer.makeEmpty("Cities");
    const layer = {
      ...emptyLayer,
      source: { ...emptyLayer.source, queryColumns: [queryColumn] },
    };

    render(<StyleSection layer={layer} onLayerChange={onLayerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Sized" }));
    const updatedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });

    expect(updatedLayer.symbology).toMatchObject({
      type: "proportionalSymbol",
      value: queryColumn.id,
    });
  });

  it("writes the circle color, radius, and outline settings", () => {
    const onLayerChange = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");

    render(<StyleSection layer={layer} onLayerChange={onLayerChange} />);

    fireEvent.change(screen.getByLabelText("Color"), {
      target: { value: "#ff0000" },
    });
    let updatedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });
    expect(updatedLayer.symbology).toMatchObject({
      color: {
        type: "single",
        color: "#ff0000",
      },
    });

    fireEvent.change(screen.getByLabelText("Radius"), {
      target: { value: "12" },
    });
    updatedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: updatedLayer,
    });
    expect(updatedLayer.symbology).toMatchObject({ radius: 12 });

    fireEvent.change(screen.getByLabelText("Outline"), {
      target: { value: "#000000" },
    });
    updatedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: updatedLayer,
    });
    expect(updatedLayer.symbology).toMatchObject({
      stroke: { color: "#000000" },
    });

    fireEvent.change(screen.getByLabelText("Outline width"), {
      target: { value: "2" },
    });
    updatedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: updatedLayer,
    });
    expect(updatedLayer.symbology).toMatchObject({
      stroke: { width: 2 },
    });
  });

  it("renders sized controls and forwards size, radius, and scale changes", () => {
    const onLayerChange = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");
    const { rerender } = render(
      <StyleSection layer={layer} onLayerChange={onLayerChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sized" }));
    const sizedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });
    rerender(<StyleSection layer={sizedLayer} onLayerChange={onLayerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Size by" }));
    const selectedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: sizedLayer,
    });
    expect(selectedLayer.symbology).toMatchObject({ value: queryColumn.id });

    fireEvent.change(screen.getByLabelText("Largest radius"), {
      target: { value: "48" },
    });
    let resizedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: selectedLayer,
    });
    expect(resizedLayer.symbology).toMatchObject({ maxRadius: 48 });

    fireEvent.change(screen.getByLabelText("Smallest radius"), {
      target: { value: "6" },
    });
    resizedLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: resizedLayer,
    });
    expect(resizedLayer.symbology).toMatchObject({ minRadius: 6 });

    expect(
      screen.getByText(
        "Symbol area is proportional to the value, not radius, so a value ten times larger draws a symbol about three times wider.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Scale" }));
    fireEvent.click(
      screen.getByRole("option", { name: "Linear", hidden: true }),
    );
    const linearlyScaledLayer = applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: resizedLayer,
    });
    expect(linearlyScaledLayer.symbology).toMatchObject({ scale: "linear" });
    rerender(
      <StyleSection
        layer={linearlyScaledLayer}
        onLayerChange={onLayerChange}
      />,
    );
    expect(
      screen.queryByText(
        "Symbol area is proportional to the value, not radius, so a value ten times larger draws a symbol about three times wider.",
      ),
    ).not.toBeInTheDocument();
  });
});
