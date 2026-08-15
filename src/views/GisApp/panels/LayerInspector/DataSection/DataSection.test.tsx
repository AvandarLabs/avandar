import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn as QueryColumnModel } from "$/models/queries/QueryColumn/QueryColumn";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
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
  sourceColumns: QueryColumn.T[];
};

let fixtures: Fixtures;

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
  return {
    dataSource: _createDataset(),
    latitudeColumn,
    longitudeColumn,
    nameColumn,
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

vi.mock("@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates", () => {
  return {
    MapLayerUpdates: {
      findQueryColumn: (
        layer: MapLayer.T,
        columnId: QueryColumn.Id | undefined,
      ) => {
        return layer.source.queryColumns.find((column) => {
          return column.id === columnId;
        });
      },
      withDataSource: (
        layer: MapLayer.T,
        dataSource: QueryDataSource.T | undefined,
      ) => {
        return {
          ...layer,
          source: { ...layer.source, dataSource },
        };
      },
      withDefaultPopupColumns: (
        layer: MapLayer.T,
        columns: readonly QueryColumn.T[],
      ) => {
        return {
          ...layer,
          popup: {
            ...layer.popup,
            columnIds: columns.map((column) => {
              return column.id;
            }),
          },
        };
      },
      withGeoBindingAxis: (
        layer: MapLayer.T,
        axis: "latitude" | "longitude",
        column: QueryColumn.T | undefined,
      ) => {
        return {
          ...layer,
          source: {
            ...layer.source,
            queryColumns:
              (
                column &&
                !layer.source.queryColumns.some((queryColumn) => {
                  return queryColumn.id === column.id;
                })
              ) ?
                [...layer.source.queryColumns, column]
              : layer.source.queryColumns,
          },
          geoBinding: {
            type: "latLngColumns" as const,
            latitude:
              axis === "latitude" ? column?.id : layer.geoBinding?.latitude,
            longitude:
              axis === "longitude" ? column?.id : layer.geoBinding?.longitude,
          },
        };
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
              label === "Latitude" ?
                fixtures.latitudeColumn
              : fixtures.longitudeColumn,
            );
          }}
        >
          {label}
        </button>
      );
    },
  };
});

function _createLayer(overrides: Partial<MapLayer.T> = {}): MapLayer.T {
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

function _createBoundLayer(): MapLayer.T {
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

describe("DataSection", () => {
  beforeEach(() => {
    fixtures = _createFixtures();
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
    expect(updatedLayer.geoBinding?.latitude).toBe(fixtures.latitudeColumn.id);
  });
});
