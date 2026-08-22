import { describe, expect, it, vi } from "vitest";

import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import {
  getCircleSymbology,
  queryColumn,
} from "@/views/GisApp/panels/LayerInspector/StyleSection/__tests__/StyleSection.fixtures";
import { StyleSection } from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection";

describe("StyleSection classification", () => {
  it.each(["circle", "proportionalSymbol"] as const)(
    "opens classification from %s point style",
    (symbologyType) => {
      const onOpenClassification = vi.fn();
      const layer = MapLayer.makeEmpty("Cities");
      const circleSymbology = getCircleSymbology(layer);
      const symbology =
        symbologyType === "circle"
          ? circleSymbology
          : {
              type: "proportionalSymbol" as const,
              value: queryColumn.id,
              minRadius: 4,
              maxRadius: 24,
              scale: "sqrt" as const,
              color: circleSymbology.color,
              stroke: circleSymbology.stroke,
            };
      render(
        <StyleSection
          layer={{ ...layer, symbology }}
          onLayerChange={vi.fn()}
          onOpenClassification={onOpenClassification}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Edit classification" }),
      );

      expect(onOpenClassification).toHaveBeenCalledOnce();
    },
  );

  it("does not offer classification for cluster style", () => {
    const layer = MapLayer.makeEmpty("Cities");
    const circleSymbology = getCircleSymbology(layer);
    render(
      <StyleSection
        layer={{
          ...layer,
          symbology: {
            type: "cluster",
            radiusPx: 50,
            color: { type: "single", color: "#228be6" },
            stroke: circleSymbology.stroke,
          },
        }}
        onLayerChange={vi.fn()}
        onOpenClassification={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Edit classification" }),
    ).not.toBeInTheDocument();
  });

  it("opens classification from polygon fill style", () => {
    const onOpenClassification = vi.fn();
    render(
      <StyleSection
        layer={MapLayer.createArea("Districts")}
        onLayerChange={vi.fn()}
        onOpenClassification={onOpenClassification}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Edit classification" }),
    );
    expect(onOpenClassification).toHaveBeenCalledOnce();
  });
});
