/**
 * Shared mocks and factories for StyleSection tests. Each scenario file
 * imports this first so its `vi.mock` calls register before the module graph.
 */
import { Model } from "@avandar/models";
import { assertIsDefined } from "@avandar/utils";
import { vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

function createNumericColumn(name: string): DatasetColumn.T {
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

export function createTextColumn(name: string): DatasetColumn.T {
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

export const queryColumn = QueryColumn.makeFromDatasetColumn(
  createNumericColumn("Population"),
);

export function getCircleSymbology(
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

vi.mock(
  "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect",
  () => {
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
  },
);

export function applyLatestUpdate(
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
