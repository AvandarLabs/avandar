import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import {
  createBoundLayer,
  createDataset,
  createNumericColumn,
} from "$/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.fixtures.ts";
import {
  QueryColumn, // oxfmt-ignore
} from "$/models/queries/QueryColumn/QueryColumn.ts";

/** An exact layer whose points are aggregated into fixed hexagonal cells. */
function _makeGridBinLayer(): MapLayer.T {
  const layer = MapLayer.createArea("Cases by hex");
  const latitude = QueryColumn.makeFromDatasetColumn(
    createNumericColumn("lat"),
  );
  const longitude = QueryColumn.makeFromDatasetColumn(
    createNumericColumn("lon"),
  );
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [latitude, longitude],
    },
    geoBinding: {
      type: "binPointsToGrid",
      grid: "hex",
      sizeMeters: 10_000,
      points: {
        type: "latLngColumns",
        latitude: latitude.id,
        longitude: longitude.id,
      },
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
  };
}

/** An exact point layer drawn with cluster paint. */
function _makeClusterLayer(): MapLayer.T {
  return {
    ...createBoundLayer(),
    symbology: {
      type: "cluster",
      radiusPx: 50,
      color: { type: "single", color: "#3b82f6" },
      stroke: { width: 1, color: "#ffffff" },
    },
  };
}

/** A fill layer whose geometry is a buffer of another layer. */
function _makeBufferLayer(sourceId: MapLayer.Id): MapLayer.T {
  return {
    ...MapLayer.createArea("Cases buffer"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: sourceId,
      distanceMeters: 1000,
      dissolve: false,
    },
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

  it("starts with no persisted classification output", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(layer.legend.breaks).toEqual([]);
    expect(layer.legend.entries).toEqual([]);
  });

  it("starts legends with empty size stops", () => {
    expect(MapLayer.makeEmpty("Cases").legend.sizeStops).toEqual([]);
  });

  it("starts overlay fields unset and applying AOI", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(layer.timeColumn).toBeUndefined();
    expect(layer.applyAoiFilter).toBe(true);
  });
});

describe("MapLayer.createArea", () => {
  it("creates an exact fill layer awaiting an area binding", () => {
    const layer = MapLayer.createArea("Cases by district");
    expect(layer.geoBinding).toBeUndefined();
    expect(layer.sensitivity).toEqual({ mode: "exact" });
    expect(layer.symbology.type).toBe("fill");
    expect(layer.legend.breaks).toEqual([]);
    expect(layer.legend.entries).toEqual([]);
  });
});

describe("MapLayer.withSensitivity", () => {
  it("keeps a buffer binding when switching to aggregate only", () => {
    const sourceId = uuid<MapLayer.Id>();
    const layer = MapLayer.withSensitivity(_makeBufferLayer(sourceId), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });
    expect(layer.geoBinding?.type).toBe("bufferOfLayer");
    expect(layer.symbology.type).toBe("fill");
  });

  it("keeps a grid-bin binding when switching to aggregate only", () => {
    const layer = MapLayer.withSensitivity(_makeGridBinLayer(), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "hex",
    });
    expect(layer.geoBinding?.type).toBe("binPointsToGrid");
    expect(layer.symbology.type).toBe("fill");
  });

  it("clears cluster paint when switching to aggregate only", () => {
    const layer = MapLayer.withSensitivity(_makeClusterLayer(), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });
    expect(layer.symbology.type).toBe("fill");
    expect(layer.geoBinding).toBeUndefined();
  });

  it("removes a point binding before applying aggregate-only", () => {
    const layer = MapLayer.withSensitivity(createBoundLayer(), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });
    expect(layer.geoBinding).toBeUndefined();
    expect(layer.symbology.type).toBe("fill");
    expect(layer.sensitivity).toEqual({
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });
  });

  it("preserves an area binding while applying aggregate-only", () => {
    const areaLayer = MapLayer.createArea("Cases by district");
    const polygonColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("geometry"),
    );
    const layerWithPolygon: MapLayer.T = {
      ...areaLayer,
      source: {
        ...areaLayer.source,
        queryColumns: [polygonColumn],
      },
      geoBinding: {
        type: "geometryColumn",
        column: polygonColumn.id,
        encoding: "wkt",
        family: "polygon",
        simplification: { tolerancePixels: 0.75 },
        sourceCrs: undefined,
      },
    };

    const protectedLayer = MapLayer.withSensitivity(layerWithPolygon, {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });

    expect(protectedLayer.geoBinding).toEqual(layerWithPolygon.geoBinding);
    expect(protectedLayer.symbology.type).toBe("fill");
  });
});

describe("MapLayer.toGeoBinding", () => {
  it("returns undefined when the layer has no binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    expect(MapLayer.toGeoBinding(layer)).toBeUndefined();
  });

  it("maps column ids to the names rows are keyed by", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lon"),
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
      createNumericColumn("lat"),
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
      createNumericColumn("lat"),
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
      createNumericColumn("lon"),
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
      createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lon"),
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
    const layer = MapLayer.fromDataSource({
      dataSource: createDataset(),
      name: "Cholera linelist",
    });
    expect(layer.name).toBe("Cholera linelist");
    expect(layer.legend.title).toBe("Cholera linelist");
  });

  it("selects the source and no columns, so nothing is bound yet", () => {
    const dataSource = createDataset();
    const layer = MapLayer.fromDataSource({
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
    const layer = createBoundLayer();
    expect(MapLayer.toPopupColumnNames(layer)).toBe("all");
  });

  it("resolves selected column ids to the names rows are keyed by", () => {
    const bound = createBoundLayer();
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
    const bound = createBoundLayer();
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
