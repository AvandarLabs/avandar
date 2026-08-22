import { describe, expect, it, vi } from "vitest";

import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen } from "@/test-utils";
import {
  createTextColumn,
  getCircleSymbology,
  queryColumn,
} from "@/views/GisApp/panels/LayerInspector/StyleSection/__tests__/StyleSection.fixtures";
import { StyleSection } from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection";

describe("StyleSection symbology availability", () => {
  it("keeps unavailable symbology options focusable without point bindings", () => {
    render(
      <StyleSection
        layer={MapLayer.makeEmpty("Cities")}
        onLayerChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Style" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Point" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Cluster" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Heat" })).toHaveAttribute(
      "aria-describedby",
      "gis-symbology-hint",
    );
    expect(
      screen.getByText(
        "Cluster and Heat require a complete point-producing binding.",
      ),
    ).toBeInTheDocument();
  });

  it.each([
    {
      type: "latLngColumns" as const,
      latitude: queryColumn.id,
      longitude: queryColumn.id,
    },
    {
      type: "geometryColumn" as const,
      column: queryColumn.id,
      encoding: "wkt" as const,
      family: "point" as const,
      simplification: undefined,
      sourceCrs: undefined,
    },
  ])("enables density styles for a complete $type point binding", (binding) => {
    const layer = MapLayer.makeEmpty("Cities");
    render(
      <StyleSection
        layer={{ ...layer, geoBinding: binding }}
        onLayerChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Cluster" })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(screen.getByRole("button", { name: "Heat" })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(
      screen.queryByText(
        "Cluster and Heat require a complete point-producing binding.",
      ),
    ).not.toBeInTheDocument();
  });

  it("locks point styles for aggregate-only sensitivity", () => {
    const layer = MapLayer.withSensitivity(MapLayer.createArea("Districts"), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });
    render(<StyleSection layer={layer} onLayerChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Point" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Cluster" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Heat" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      screen.getByText(
        "Aggregate-only layers require an area-producing binding.",
      ),
    ).toBeInTheDocument();
  });

  it("renders cluster radius, color, and outline controls", () => {
    const layer = MapLayer.makeEmpty("Cities");
    const circleSymbology = getCircleSymbology(layer);
    render(
      <StyleSection
        layer={{
          ...layer,
          geoBinding: {
            type: "latLngColumns",
            latitude: queryColumn.id,
            longitude: queryColumn.id,
          },
          symbology: {
            type: "cluster",
            radiusPx: 50,
            color: { type: "single", color: "#228be6" },
            stroke: circleSymbology.stroke,
          },
        }}
        onLayerChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Cluster radius")).toHaveValue("50 px");
    expect(screen.getByLabelText("Color")).toBeInTheDocument();
    expect(screen.getByLabelText("Outline")).toBeInTheDocument();
  });

  it("renders heatmap radius, weight, and ramp controls", () => {
    const layer = MapLayer.makeEmpty("Cities");
    const textColumn = QueryColumn.makeFromDatasetColumn(
      createTextColumn("Category"),
    );
    render(
      <StyleSection
        layer={{
          ...layer,
          source: {
            ...layer.source,
            queryColumns: [queryColumn, textColumn],
          },
          geoBinding: {
            type: "latLngColumns",
            latitude: queryColumn.id,
            longitude: queryColumn.id,
          },
          symbology: {
            type: "heatmap",
            radiusPx: 30,
            weight: undefined,
            ramp: MapLayer.defaultHeatmapRamp,
          },
        }}
        onLayerChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Heat radius")).toHaveValue("30 px");
    fireEvent.click(screen.getByRole("combobox", { name: "Weight by" }));
    expect(
      screen.getByRole("option", { name: "Population", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Category", hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Color ramp" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Outline")).not.toBeInTheDocument();
  });
});
