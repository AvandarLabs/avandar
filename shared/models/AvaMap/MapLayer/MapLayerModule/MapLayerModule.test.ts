import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import {
  QueryColumn, // prettier-ignore
} from "$/models/queries/QueryColumn/QueryColumn.ts";
import { describe, expect, it } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type {
  DatasetColumn, // prettier-ignore
} from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

/** An honest `DatasetColumn`, built through `Model.make` with no cast. */
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

/** An honest `Dataset`, built through `Model.make` with no cast. */
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

/** A layer with a data source and a geo binding that resolves. */
function _createBoundLayer(): MapLayer.T {
  const layer = MapLayer.makeEmpty("Cases");
  const latitude = QueryColumn.makeFromDatasetColumn(
    _createNumericColumn("lat"),
  );
  const longitude = QueryColumn.makeFromDatasetColumn(
    _createNumericColumn("lon"),
  );
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: _createDataset(),
      queryColumns: [latitude, longitude],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude.id,
      longitude: longitude.id,
    },
    popup: { ...layer.popup, action: undefined },
  };
}

describe("MapLayer.makeEmpty", () => {
  it("is visible, unbound, and exact by default", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(layer.isVisible).toBe(true);
    expect(layer.geoBinding).toBeUndefined();
    expect(layer.sensitivity).toEqual({ mode: "exact" });
    expect(layer.symbology.type).toBe("circle");
    expect(layer.popup.action).toBeUndefined();
  });
});

describe("MapLayer.toGeoBinding", () => {
  it("returns undefined when the layer has no binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("maps column ids to the names rows are keyed by", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lon"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      source: {
        ...MapLayer.makeEmpty("Cases").source,
        queryColumns: [latitude, longitude],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: longitude.id,
      },
    };

    expect(MapLayer.toGeoBinding(layer)).toEqual({
      type: "latLngColumns",
      latitudeColumnName: "lat",
      longitudeColumnName: "lon",
    });
  });

  it("returns undefined when a bound column is not in the query", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lat"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: latitude.id,
      },
    };
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("returns undefined when only latitude is set", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lat"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      source: {
        ...MapLayer.makeEmpty("Cases").source,
        queryColumns: [latitude],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: undefined,
      },
    };
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("returns undefined when only longitude is set", () => {
    const longitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lon"),
    );
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      source: {
        ...MapLayer.makeEmpty("Cases").source,
        queryColumns: [longitude],
      },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: undefined,
        longitude: longitude.id,
      },
    };
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("starts resolving only once the second axis is added", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("lon"),
    );
    const emptyLayer = MapLayer.makeEmpty("Cases");
    const withLatitudeOnly = {
      ...emptyLayer,
      source: { ...emptyLayer.source, queryColumns: [latitude] },
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: latitude.id,
        longitude: undefined,
      },
    };
    expect(MapLayer.toGeoBinding(withLatitudeOnly)).toBeUndefined();

    const withBothAxes = {
      ...withLatitudeOnly,
      source: {
        ...withLatitudeOnly.source,
        queryColumns: [latitude, longitude],
      },
      geoBinding: {
        ...withLatitudeOnly.geoBinding,
        longitude: longitude.id,
      },
    };
    expect(MapLayer.toGeoBinding(withBothAxes)).toEqual({
      type: "latLngColumns",
      latitudeColumnName: "lat",
      longitudeColumnName: "lon",
    });
  });
});

describe("makeFromDataSource", () => {
  it("names the layer and its legend after the caller's name", () => {
    const layer = MapLayer.makeFromDataSource({
      dataSource: _createDataset(),
      name: "Cholera linelist",
    });
    expect(layer.name).toBe("Cholera linelist");
    expect(layer.legend.title).toBe("Cholera linelist");
  });

  it("selects the source and no columns, so nothing is bound yet", () => {
    const dataSource = _createDataset();
    const layer = MapLayer.makeFromDataSource({
      dataSource,
      name: "Cholera linelist",
    });
    expect(layer.source.dataSource).toBe(dataSource);
    expect(layer.source.queryColumns).toEqual([]);
    expect(layer.geoBinding).toBeUndefined();
  });
});

describe("toPopupColumnNames", () => {
  it("returns every non-coordinate column name when set to all", () => {
    const layer = _createBoundLayer();
    expect(MapLayer.toPopupColumnNames(layer)).toBe("all");
  });

  it("resolves selected column ids to the names rows are keyed by", () => {
    const bound = _createBoundLayer();
    const [firstColumn] = bound.source.queryColumns;
    const layer: MapLayer.T = {
      ...bound,
      popup: { columnIds: [firstColumn!.id], action: undefined },
    };
    expect(MapLayer.toPopupColumnNames(layer)).toEqual([
      QueryColumn.getDerivedColumnName(firstColumn!),
    ]);
  });

  it("drops a selected column that is no longer in the layer's query", () => {
    const bound = _createBoundLayer();
    const layer: MapLayer.T = {
      ...bound,
      popup: {
        columnIds: [uuid<QueryColumn.Id>()],
        action: undefined,
      },
    };
    expect(MapLayer.toPopupColumnNames(layer)).toEqual([]);
  });
});
