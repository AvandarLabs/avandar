import { Model } from "@avandar/models";
import { prop, propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn as QueryColumnModel } from "$/models/queries/QueryColumn/QueryColumn";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { BoundarySourceControls } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundarySourceControls";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
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
  nameColumn: QueryColumn.T;
  geometryColumn: QueryColumn.T;
  sourceColumns: QueryColumn.T[];
};

let fixtures: Fixtures;

const spatialAvailability = vi.hoisted(() => {
  return { value: "available" as "loading" | "available" | "unavailable" };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      getSpatialAvailability: () => {
        return spatialAvailability.value;
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
function _createDataset(): Dataset.T {
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
function _createFixtures(): Fixtures {
  const latitudeColumn = _createNumericColumn("Lat");
  const longitudeColumn = _createNumericColumn("Long_");
  const nameColumn = _createNumericColumn("Name");
  const geometryColumn = _createNumericColumn("Geometry");
  return {
    dataSource: _createDataset(),
    latitudeColumn,
    longitudeColumn,
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
  return {
    MapLayerUpdates: {
      getQueryColumnFromLayer: ({
        layer,
        columnId,
      }: Readonly<{
        layer: MapLayer.T;
        columnId: QueryColumn.Id | undefined;
      }>) => {
        return layer.source.queryColumns.find(propEq("id", columnId));
      },
      withDataSource: ({
        layer,
        dataSource,
      }: Readonly<{
        layer: MapLayer.T;
        dataSource: QueryDataSource.T | undefined;
      }>) => {
        return {
          ...layer,
          source: { ...layer.source, dataSource },
        };
      },
      withDefaultPopupColumns: ({
        layer,
        availableColumns,
      }: Readonly<{
        layer: MapLayer.T;
        availableColumns: readonly QueryColumn.T[];
      }>) => {
        return {
          ...layer,
          popup: {
            ...layer.popup,
            columnIds: availableColumns.map(prop("id")),
          },
        };
      },
      withGeoBindingAxis: ({
        layer,
        axis,
        column,
      }: Readonly<{
        layer: MapLayer.T;
        axis: "latitude" | "longitude";
        column: QueryColumn.T | undefined;
      }>) => {
        const binding =
          layer.geoBinding?.type === "latLngColumns" ?
            layer.geoBinding
          : undefined;
        return {
          ...layer,
          source: {
            ...layer.source,
            queryColumns:
              (
                column &&
                !layer.source.queryColumns.some(propEq("id", column.id))
              ) ?
                [...layer.source.queryColumns, column]
              : layer.source.queryColumns,
          },
          geoBinding: {
            type: "latLngColumns" as const,
            latitude: axis === "latitude" ? column?.id : binding?.latitude,
            longitude: axis === "longitude" ? column?.id : binding?.longitude,
          },
        };
      },
      withGeometryBindingType: (
        layer: MapLayer.T,
        type: "latLngColumns" | "geometryColumn",
        column?: QueryColumn.T,
      ) => {
        return {
          ...layer,
          geoBinding:
            type === "latLngColumns" ?
              { type, latitude: undefined, longitude: undefined }
            : {
                type,
                column: column!.id,
                encoding: "wkt" as const,
                family: "point" as const,
                simplification: undefined,
              },
        } as MapLayer.T;
      },
      withGeometryColumn: (layer: MapLayer.T, column: QueryColumn.T) => {
        return {
          ...layer,
          geoBinding: {
            ...(layer.geoBinding as Extract<
              MapLayer.GeoBinding,
              { type: "geometryColumn" }
            >),
            column: column.id,
          },
        } as MapLayer.T;
      },
      withGeometryEncoding: (
        layer: MapLayer.T,
        encoding: MapLayer.GeometryEncoding,
      ) => {
        return {
          ...layer,
          geoBinding: { ...layer.geoBinding, encoding },
        } as MapLayer.T;
      },
      withGeometryFamily: (
        layer: MapLayer.T,
        family: MapLayer.GeometryFamily,
      ) => {
        return {
          ...layer,
          geoBinding: { ...layer.geoBinding, family },
        } as MapLayer.T;
      },
      withGeometrySimplification: (
        layer: MapLayer.T,
        simplification: MapLayer.GeometrySimplification | undefined,
      ) => {
        return {
          ...layer,
          geoBinding: { ...layer.geoBinding, simplification },
        } as MapLayer.T;
      },
      withBoundaryJoin: (
        layer: MapLayer.T,
        update: {
          dataKeyColumn: QueryColumn.T;
          matching: "exact" | "normalizedName";
          boundary: MapLayer.BoundarySource;
        },
      ) => {
        return {
          ...layer,
          geoBinding: {
            type: "joinToBoundaries" as const,
            ...update,
            dataKeyColumn: update.dataKeyColumn.id,
            aggregation: {
              operation: "count" as const,
              outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
            },
          },
          symbology: MapLayer.createDefaultFillSymbology(),
        } as MapLayer.T;
      },
    },
  };
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

vi.mock("@/views/DataExplorerApp/QueryColumnSingleSelect", () => {
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
});

function _createLayer(
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

function _createBoundLayer(): MapLayer.Standard {
  return {
    ..._createLayer({
      source: {
        ..._createLayer().source,
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

function _createGeometryLayer(): MapLayer.T {
  const layer = _createLayer({
    source: {
      ..._createLayer().source,
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
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  };
}

describe("DataSection", () => {
  beforeEach(() => {
    fixtures = _createFixtures();
    spatialAvailability.value = "available";
  });

  it("infers coordinates and defaults the popup columns for an unbound layer", async () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();

    render(
      <DataSection layer={_createLayer()} onLayerChange={onLayerChange} />,
    );

    await waitFor(() => {
      expect(onLayerChange).toHaveBeenCalledOnce();
    });

    const update = onLayerChange.mock.calls[0]![0];
    const updatedLayer = update(_createLayer());
    expect(updatedLayer.geoBinding).toEqual({
      type: "latLngColumns",
      latitude: fixtures.latitudeColumn.id,
      longitude: fixtures.longitudeColumn.id,
    });
    expect(updatedLayer.popup.columnIds).toEqual([
      fixtures.latitudeColumn.id,
      fixtures.longitudeColumn.id,
    ]);
  });

  it("explains which columns were matched after a binding is present", () => {
    fixtures.sourceColumns = [
      fixtures.latitudeColumn,
      fixtures.longitudeColumn,
    ];

    render(<DataSection layer={_createBoundLayer()} onLayerChange={vi.fn()} />);

    expect(
      screen.getByText(
        "Latitude and longitude were matched from the column names Lat and Long_. Change them above if that is wrong.",
      ),
    ).toBeInTheDocument();
  });

  it("does not infer a missing axis when the other axis is already bound", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = {
      ..._createLayer(),
      source: {
        ..._createLayer().source,
        queryColumns: [fixtures.latitudeColumn],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: fixtures.latitudeColumn.id,
        longitude: undefined,
      },
    };

    render(<DataSection layer={layer} onLayerChange={onLayerChange} />);

    expect(onLayerChange).not.toHaveBeenCalled();
  });

  it("explains when a selected source has no coordinate columns", () => {
    fixtures.sourceColumns = [fixtures.nameColumn];
    const layer = _createLayer();

    render(<DataSection layer={layer} onLayerChange={vi.fn()} />);

    expect(
      screen.getByText(
        "No column in Cases holds coordinates. Boundary joins arrive in a later release, so pick a different source.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Latitude" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Longitude" }),
    ).not.toBeInTheDocument();
  });

  it("updates a coordinate binding when a coordinate column changes", () => {
    fixtures.sourceColumns = [
      fixtures.latitudeColumn,
      fixtures.longitudeColumn,
    ];
    const onLayerChange = vi.fn<LayerChangeHandler>();

    render(
      <DataSection layer={_createBoundLayer()} onLayerChange={onLayerChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Latitude" }));

    expect(onLayerChange).toHaveBeenCalledOnce();
    const update = onLayerChange.mock.calls[0]![0];
    const updatedLayer = update(_createBoundLayer());
    expect(updatedLayer.geoBinding?.type).toBe("latLngColumns");
    if (updatedLayer.geoBinding?.type !== "latLngColumns") {
      return;
    }
    expect(updatedLayer.geoBinding.latitude).toBe(fixtures.latitudeColumn.id);
  });

  it("shows the complete geometry-column controls", () => {
    render(
      <DataSection layer={_createGeometryLayer()} onLayerChange={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: "Geometry column" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("combobox", { name: "Encoding" }).at(-1),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("combobox", { name: "Expected geometry" }).at(-1),
    ).toBeInTheDocument();
    expect(screen.getByText("Advanced geometry settings")).toBeInTheDocument();
  });

  it("keeps the boundary-join choice visible", () => {
    render(<DataSection layer={_createBoundLayer()} onLayerChange={vi.fn()} />);
    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;
    fireEvent.click(geometrySelect);
    expect(screen.getByText("Join to boundaries")).toBeInTheDocument();
  });

  it("changes the boundary dataset and resets its column references", () => {
    const firstBoundary = _createDataset();
    const secondBoundary = _createDataset();
    const firstColumns = [
      fixtures.latitudeColumn.baseColumn as DatasetColumn.T,
      fixtures.longitudeColumn.baseColumn as DatasetColumn.T,
    ];
    const secondColumns = [
      fixtures.nameColumn.baseColumn as DatasetColumn.T,
      fixtures.geometryColumn.baseColumn as DatasetColumn.T,
    ];
    const layer = {
      ...MapLayer.createArea("Cases by district"),
      source: {
        ...MapLayer.createArea("Cases by district").source,
        dataSource: fixtures.dataSource,
        queryColumns: [fixtures.nameColumn],
      },
      geoBinding: {
        type: "joinToBoundaries" as const,
        dataKeyColumn: fixtures.nameColumn.id,
        matching: "exact" as const,
        boundary: {
          datasetId: firstBoundary.id,
          geometryColumnId: firstColumns[0]!.id,
          geometryEncoding: "wkt" as const,
          keyColumnId: firstColumns[1]!.id,
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
        aggregation: {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
      },
    };
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(
      <BoundarySourceControls
        layer={layer}
        dataKeyColumn={fixtures.nameColumn}
        options={[
          { dataset: firstBoundary, label: "First", columns: firstColumns },
          { dataset: secondBoundary, label: "Second", columns: secondColumns },
        ]}
        onLayerChange={onLayerChange}
      />,
    );

    const datasetSelect = screen.getByRole("combobox", {
      name: "Boundary dataset",
    });
    expect(datasetSelect).not.toHaveAttribute("data-read-only");
    fireEvent.click(datasetSelect);
    fireEvent.click(
      screen.getByRole("option", { name: "Second", hidden: true }),
    );

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.geoBinding).toMatchObject({
      boundary: {
        datasetId: secondBoundary.id,
        geometryColumnId: secondColumns[0]!.id,
        keyColumnId: secondColumns[1]!.id,
      },
    });
  });

  it("offers point aggregation into boundaries", () => {
    render(<DataSection layer={_createBoundLayer()} onLayerChange={vi.fn()} />);
    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;

    fireEvent.click(geometrySelect);

    expect(
      screen.getByText("Aggregate points to boundaries"),
    ).toBeInTheDocument();
  });

  it("keeps geometry columns visible but disabled while Spatial loads", () => {
    spatialAvailability.value = "loading";
    render(<DataSection layer={_createBoundLayer()} onLayerChange={vi.fn()} />);

    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;
    fireEvent.click(geometrySelect);
    expect(
      screen.getAllByText("Geometry column").at(-1)?.closest('[role="option"]'),
    ).toHaveAttribute("data-combobox-disabled", "true");
    expect(
      screen.getByText(
        "Geometry columns are available when Spatial finishes loading.",
      ),
    ).toBeInTheDocument();
  });

  it("explains when Spatial is unavailable", () => {
    spatialAvailability.value = "unavailable";
    render(<DataSection layer={_createBoundLayer()} onLayerChange={vi.fn()} />);

    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;
    fireEvent.click(geometrySelect);
    expect(
      screen.getAllByText("Geometry column").at(-1)?.closest('[role="option"]'),
    ).toHaveAttribute("data-combobox-disabled", "true");
    expect(
      screen.getByText(
        "Geometry columns need DuckDB Spatial, which is unavailable.",
      ),
    ).toBeInTheDocument();
  });
});
