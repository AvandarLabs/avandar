/**
 * Shared mocks and factories for DataSection tests. Each scenario file
 * imports this first so its `vi.mock` calls register before the module graph.
 */
import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn as QueryColumnModel } from "$/models/queries/QueryColumn/QueryColumn";
import { vi } from "vitest";
import { createDataSectionMapLayerUpdatesMock } from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.mapLayerUpdatesMock";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

type Fixtures = {
  dataSource: QueryDataSource.T;
  latitudeColumn: QueryColumn.T;
  longitudeColumn: QueryColumn.T;
  yColumn: QueryColumn.T;
  xColumn: QueryColumn.T;
  nameColumn: QueryColumn.T;
  geometryColumn: QueryColumn.T;
  sourceColumns: QueryColumn.T[];
};

export let fixtures!: Fixtures;

const spatialAvailabilityState = vi.hoisted(() => {
  return { value: "available" as "loading" | "available" | "unavailable" };
});

/** Mutable Spatial availability used by the DuckDbClient mock. */
export const spatialAvailability = spatialAvailabilityState;

const initializeMock = vi.hoisted(() => {
  return vi.fn(async () => {
    return undefined;
  });
});

/** The `DuckDbClient.initialize` spy the Spatial deadlock test asserts on. */
export const duckDbInitialize = initializeMock;

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      initialize: initializeMock,
      getSpatialAvailability: () => {
        return spatialAvailabilityState.value;
      },
      subscribeSpatialAvailability: () => {
        return () => {
          return undefined;
        };
      },
    },
  };
});

/** Creates a real dataset source for the inspector's query-column fixtures. */
export function createDataset(): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Cases",
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

/** Creates a numeric query column for coordinate inference. */
function _createNumericColumn(name: string): QueryColumn.T {
  const now = new Date().toISOString();
  const datasetColumn = Model.make("DatasetColumn", {
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
  return QueryColumnModel.makeFromDatasetColumn(datasetColumn);
}

/** Creates the columns supplied by the mocked source-columns hook. */
export function createFixtures(): Fixtures {
  const latitudeColumn = _createNumericColumn("Lat");
  const longitudeColumn = _createNumericColumn("Long_");
  const yColumn = _createNumericColumn("y");
  const xColumn = _createNumericColumn("x");
  const nameColumn = _createNumericColumn("Name");
  const geometryColumn = _createNumericColumn("Geometry");
  return {
    dataSource: createDataset(),
    latitudeColumn,
    longitudeColumn,
    yColumn,
    xColumn,
    nameColumn,
    geometryColumn,
    sourceColumns: [latitudeColumn, longitudeColumn],
  };
}

vi.mock(
  "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection",
  () => {
    return {
      InspectorSection: ({
        children,
        title,
      }: {
        children: ReactNode;
        title: string;
      }) => {
        return <section aria-label={title}>{children}</section>;
      },
    };
  },
);

vi.mock("@/views/GisApp/panels/LayerInspector/useLayerSourceColumns", () => {
  return {
    useLayerSourceColumns: () => {
      return fixtures.sourceColumns;
    },
  };
});

vi.mock(
  "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions",
  () => {
    return {
      useBoundarySourceOptions: () => {
        return { options: [], isLoading: false };
      },
    };
  },
);

vi.mock("@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates", () => {
  return createDataSectionMapLayerUpdatesMock();
});

vi.mock("@/views/DataExplorerApp/QueryDataSourceSelect", () => {
  return {
    QueryDataSourceSelect: ({
      label,
      onChange,
    }: {
      label: string;
      onChange: (dataSource: QueryDataSource.T | null) => void;
    }) => {
      return (
        <button
          aria-label={label}
          onClick={() => {
            onChange(fixtures.dataSource);
          }}
        >
          {label}
        </button>
      );
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
        label: string;
        onChange: (column: QueryColumn.T | null) => void;
      }) => {
        return (
          <button
            aria-label={label}
            onClick={() => {
              onChange(
                label === "Latitude" ? fixtures.latitudeColumn
                : label === "Longitude" ? fixtures.longitudeColumn
                : fixtures.geometryColumn,
              );
            }}
          >
            {label}
          </button>
        );
      },
    };
  },
);

export function createLayer(
  overrides: Partial<MapLayer.Standard> = {},
): MapLayer.Standard {
  const emptyLayer = MapLayer.makeEmpty("Cases");
  return {
    ...emptyLayer,
    source: {
      ...emptyLayer.source,
      dataSource: fixtures.dataSource,
      queryColumns: [],
    },
    ...overrides,
  };
}

export function createBoundLayer(): MapLayer.Standard {
  return {
    ...createLayer({
      source: {
        ...createLayer().source,
        queryColumns: [fixtures.latitudeColumn, fixtures.longitudeColumn],
      },
    }),
    geoBinding: {
      type: "latLngColumns",
      latitude: fixtures.latitudeColumn.id,
      longitude: fixtures.longitudeColumn.id,
    },
  };
}

/** A bound layer whose coordinates were guessed from `y` and `x`. */
export function createXyBoundLayer(): MapLayer.Standard {
  return {
    ...createLayer({
      source: {
        ...createLayer().source,
        queryColumns: [fixtures.yColumn, fixtures.xColumn],
      },
    }),
    geoBinding: {
      type: "latLngColumns",
      latitude: fixtures.yColumn.id,
      longitude: fixtures.xColumn.id,
    },
  };
}

export function createGeometryLayer(): MapLayer.T {
  const layer = createLayer({
    source: {
      ...createLayer().source,
      queryColumns: [fixtures.geometryColumn],
    },
  });
  return {
    ...layer,
    geoBinding: {
      type: "geometryColumn",
      column: fixtures.geometryColumn.id,
      encoding: "wkt",
      family: "polygon",
      simplification: { tolerancePixels: 0.75 },
      sourceCrs: undefined,
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  };
}

export function createGridBinLayer(): MapLayer.Standard {
  const layer = createBoundLayer();
  return {
    ...layer,
    geoBinding: {
      type: "binPointsToGrid",
      grid: "hex",
      sizeMeters: MapLayer.defaultGridSizeMeters,
      points: {
        type: "latLngColumns",
        latitude: fixtures.latitudeColumn.id,
        longitude: fixtures.longitudeColumn.id,
      },
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  };
}

/** Rebuilds the mutable fixture bag used by the DataSection mocks. */
export function resetDataSectionFixtures(): void {
  fixtures = createFixtures();
  spatialAvailability.value = "available";
  initializeMock.mockClear();
}
