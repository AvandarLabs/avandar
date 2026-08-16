import { Model } from "@avandar/models";
import { assertIsDefined } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { StyleSection } from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

function _createNumericColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "DOUBLE",
    dataType: "double",
    detectedDataType: "DOUBLE",
    description: undefined,
    columnIdx: 0,
  });
}

function _createTextColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "VARCHAR",
    dataType: "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 1,
  });
}

const queryColumn = QueryColumn.makeFromDatasetColumn(
  _createNumericColumn("Population"),
);

function _getCircleSymbology(
  layer: MapLayer.T,
): Extract<MapLayer.Symbology, { type: "circle" }> {
  if (layer.symbology.type !== "circle") {
    throw new Error("Expected circle symbology");
  }
  return layer.symbology;
}

vi.mock(
  "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection",
  () => {
    return {
      InspectorSection: ({
        children,
        title,
      }: {
        children: React.ReactNode;
        title: React.ReactNode;
      }) => {
        return (
          <section>
            <h2>{title}</h2>
            {children}
          </section>
        );
      },
    };
  },
);

vi.mock("@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates", () => {
  return {
    MapLayerUpdates: {
      getQueryColumnFromLayer: vi.fn(() => {
        return undefined;
      }),
      withSymbologyType: vi.fn(({ layer, change }) => {
        if (change.nextType === "circle") {
          const remembered = change.remembered;
          return {
            ...layer,
            symbology: remembered ?? {
              type: "circle",
              radius: 6,
              color: layer.symbology.color,
              stroke: layer.symbology.stroke,
            },
          };
        }
        return {
          ...layer,
          symbology: change.remembered ?? {
            type: "proportionalSymbol",
            value: change.valueColumn?.id ?? queryColumn.id,
            minRadius: 4,
            maxRadius: 24,
            scale: "sqrt",
            color: layer.symbology.color,
            stroke: layer.symbology.stroke,
          },
        };
      }),
      withSymbolColor: vi.fn(({ layer, color }) => {
        return {
          ...layer,
          symbology: {
            ...layer.symbology,
            color: { type: "single", color },
          },
        };
      }),
      withCircleRadius: vi.fn(({ layer, radius }) => {
        return { ...layer, symbology: { ...layer.symbology, radius } };
      }),
      withSymbolSizeColumn: vi.fn(({ layer, column }) => {
        return {
          ...layer,
          symbology: {
            ...layer.symbology,
            type: "proportionalSymbol",
            value: column?.id,
          },
        };
      }),
      withMaxSymbolRadius: vi.fn(({ layer, maxRadius }) => {
        return { ...layer, symbology: { ...layer.symbology, maxRadius } };
      }),
      withMinSymbolRadius: vi.fn(({ layer, minRadius }) => {
        return { ...layer, symbology: { ...layer.symbology, minRadius } };
      }),
      withSymbolScale: vi.fn(({ layer, scale }) => {
        return { ...layer, symbology: { ...layer.symbology, scale } };
      }),
      withStroke: vi.fn(({ layer, stroke }) => {
        return {
          ...layer,
          symbology: {
            ...layer.symbology,
            stroke: { ...layer.symbology.stroke, ...stroke },
          },
        };
      }),
    },
  };
});

vi.mock("@/views/DataExplorerApp/QueryColumnSingleSelect", () => {
  return {
    QueryColumnSingleSelect: ({
      label,
      onChange,
    }: {
      label: ReactNode;
      onChange: (column: QueryColumn.T | null) => void;
    }) => {
      return (
        <button
          type="button"
          onClick={() => {
            return onChange(queryColumn);
          }}
        >
          {label}
        </button>
      );
    },
  };
});

function _applyLatestUpdate(
  options: Readonly<{
    onLayerChange: ReturnType<typeof vi.fn>;
    layer: MapLayer.T;
  }>,
): MapLayer.T {
  const { onLayerChange, layer } = options;
  const latestCall = onLayerChange.mock.lastCall;
  assertIsDefined(latestCall, "Expected a layer update");
  return latestCall[0](layer);
}

describe("StyleSection", () => {
  it.each(["circle", "proportionalSymbol"] as const)(
    "opens classification from %s point style",
    (symbologyType) => {
      const onOpenClassification = vi.fn();
      const layer = MapLayer.makeEmpty("Cities");
      const circleSymbology = _getCircleSymbology(layer);
      const symbology =
        symbologyType === "circle" ? circleSymbology : (
          {
            type: "proportionalSymbol" as const,
            value: queryColumn.id,
            minRadius: 4,
            maxRadius: 24,
            scale: "sqrt" as const,
            color: circleSymbology.color,
            stroke: circleSymbology.stroke,
          }
        );
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
    const circleSymbology = _getCircleSymbology(layer);
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
    const circleSymbology = _getCircleSymbology(layer);
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
      _createTextColumn("Category"),
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

  it("restores the previous point settings after switching from sized", () => {
    const onLayerChange = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");

    const { rerender } = render(
      <StyleSection layer={layer} onLayerChange={onLayerChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sized" }));
    const sizedLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });
    rerender(<StyleSection layer={sizedLayer} onLayerChange={onLayerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Point" }));
    const restoredLayer = _applyLatestUpdate({
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
    const updatedLayer = _applyLatestUpdate({
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
    let updatedLayer = _applyLatestUpdate({
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
    updatedLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: updatedLayer,
    });
    expect(updatedLayer.symbology).toMatchObject({ radius: 12 });

    fireEvent.change(screen.getByLabelText("Outline"), {
      target: { value: "#000000" },
    });
    updatedLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: updatedLayer,
    });
    expect(updatedLayer.symbology).toMatchObject({
      stroke: { color: "#000000" },
    });

    fireEvent.change(screen.getByLabelText("Outline width"), {
      target: { value: "2" },
    });
    updatedLayer = _applyLatestUpdate({
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
    const sizedLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });
    rerender(<StyleSection layer={sizedLayer} onLayerChange={onLayerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Size by" }));
    const selectedLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: sizedLayer,
    });
    expect(selectedLayer.symbology).toMatchObject({ value: queryColumn.id });

    fireEvent.change(screen.getByLabelText("Largest radius"), {
      target: { value: "48" },
    });
    let resizedLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: selectedLayer,
    });
    expect(resizedLayer.symbology).toMatchObject({ maxRadius: 48 });

    fireEvent.change(screen.getByLabelText("Smallest radius"), {
      target: { value: "6" },
    });
    resizedLayer = _applyLatestUpdate({
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
    const linearlyScaledLayer = _applyLatestUpdate({
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
