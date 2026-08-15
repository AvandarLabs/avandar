import { Model } from "@avandar/models";
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

const queryColumn = QueryColumn.makeFromDatasetColumn(
  _createNumericColumn("Population"),
);

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
      findQueryColumn: vi.fn(() => {
        return undefined;
      }),
      withSymbologyType: vi.fn((layer, options) => {
        if (options.nextType === "circle") {
          const remembered = options.remembered;
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
          symbology: options.remembered ?? {
            type: "proportionalSymbol",
            value: options.valueColumn?.id ?? queryColumn.id,
            minRadius: 4,
            maxRadius: 24,
            scale: "sqrt",
            color: layer.symbology.color,
            stroke: layer.symbology.stroke,
          },
        };
      }),
      withSymbolColor: vi.fn((layer, color) => {
        return {
          ...layer,
          symbology: {
            ...layer.symbology,
            color: { type: "single", color },
          },
        };
      }),
      withCircleRadius: vi.fn((layer, radius) => {
        return { ...layer, symbology: { ...layer.symbology, radius } };
      }),
      withSymbolSizeColumn: vi.fn((layer, column) => {
        return {
          ...layer,
          symbology: {
            ...layer.symbology,
            type: "proportionalSymbol",
            value: column?.id,
          },
        };
      }),
      withMaxSymbolRadius: vi.fn((layer, maxRadius) => {
        return { ...layer, symbology: { ...layer.symbology, maxRadius } };
      }),
      withStroke: vi.fn((layer, stroke) => {
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
  onLayerChange: ReturnType<typeof vi.fn>,
  layer: MapLayer.T,
): MapLayer.T {
  const latestCall = onLayerChange.mock.lastCall;
  if (!latestCall) {
    throw new Error("Expected a layer update");
  }
  return latestCall[0](layer);
}

describe("StyleSection", () => {
  it("keeps unavailable symbology options focusable and explains why", () => {
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
        "Cluster and Heat are unavailable: they arrive in a later release.",
      ),
    ).toBeInTheDocument();
  });

  it("restores the previous point settings after switching from sized", () => {
    const onLayerChange = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");

    const { rerender } = render(
      <StyleSection layer={layer} onLayerChange={onLayerChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sized" }));
    const sizedLayer = _applyLatestUpdate(onLayerChange, layer);
    rerender(<StyleSection layer={sizedLayer} onLayerChange={onLayerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Point" }));
    const restoredLayer = _applyLatestUpdate(onLayerChange, sizedLayer);

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
    const updatedLayer = _applyLatestUpdate(onLayerChange, layer);

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
    let updatedLayer = _applyLatestUpdate(onLayerChange, layer);
    expect(updatedLayer.symbology.color.color).toBe("#ff0000");

    fireEvent.change(screen.getByLabelText("Radius"), {
      target: { value: "12" },
    });
    updatedLayer = _applyLatestUpdate(onLayerChange, updatedLayer);
    expect(updatedLayer.symbology).toMatchObject({ radius: 12 });

    fireEvent.change(screen.getByLabelText("Outline"), {
      target: { value: "#000000" },
    });
    updatedLayer = _applyLatestUpdate(onLayerChange, updatedLayer);
    expect(updatedLayer.symbology.stroke.color).toBe("#000000");

    fireEvent.change(screen.getByLabelText("Outline width"), {
      target: { value: "2" },
    });
    updatedLayer = _applyLatestUpdate(onLayerChange, updatedLayer);
    expect(updatedLayer.symbology.stroke.width).toBe(2);
  });

  it("renders sized controls and forwards size and radius changes", () => {
    const onLayerChange = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");
    const { rerender } = render(
      <StyleSection layer={layer} onLayerChange={onLayerChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sized" }));
    const sizedLayer = _applyLatestUpdate(onLayerChange, layer);
    rerender(<StyleSection layer={sizedLayer} onLayerChange={onLayerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Size by" }));
    const selectedLayer = _applyLatestUpdate(onLayerChange, sizedLayer);
    expect(selectedLayer.symbology).toMatchObject({ value: queryColumn.id });

    fireEvent.change(screen.getByLabelText("Largest radius"), {
      target: { value: "48" },
    });
    const resizedLayer = _applyLatestUpdate(onLayerChange, selectedLayer);
    expect(resizedLayer.symbology).toMatchObject({ maxRadius: 48 });
  });
});
