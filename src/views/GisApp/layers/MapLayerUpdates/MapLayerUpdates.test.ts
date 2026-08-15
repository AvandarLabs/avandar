import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

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

describe("withPopupColumns", () => {
  it("selects the columns and adds them to the layer's query", () => {
    const column = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const layer = MapLayer.makeEmpty("Cases");
    const updatedLayer = MapLayerUpdates.withPopupColumns({
      layer: layer,
      columns: [column],
    });
    expect(updatedLayer.popup.columnIds).toEqual([column.id]);
    expect(updatedLayer.source.queryColumns).toContain(column);
  });

  it("keeps a column the geometry binding needs when it is deselected", () => {
    const bound = _createBoundLayer();
    expect(bound.geoBinding?.type).toBe("latLngColumns");
    if (bound.geoBinding?.type !== "latLngColumns") return;
    const updatedLayer = MapLayerUpdates.withPopupColumns({
      layer: bound,
      columns: [],
    });
    expect(updatedLayer.popup.columnIds).toEqual([]);
    expect(updatedLayer.source.queryColumns.map(prop("id"))).toEqual(
      expect.arrayContaining([
        bound.geoBinding!.latitude!,
        bound.geoBinding!.longitude!,
      ]),
    );
  });

  it("drops a column that is neither bound nor selected any more", () => {
    const extra = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const bound = MapLayerUpdates.withPopupColumns({
      layer: _createBoundLayer(),
      columns: [extra],
    });
    const updatedLayer = MapLayerUpdates.withPopupColumns({
      layer: bound,
      columns: [],
    });
    expect(updatedLayer.source.queryColumns).not.toContain(extra);
  });

  it("does not select the same base column twice under two ids", () => {
    const bound = _createBoundLayer();
    expect(bound.geoBinding?.type).toBe("latLngColumns");
    if (bound.geoBinding?.type !== "latLngColumns") return;
    const latitudeColumn = MapLayerUpdates.getQueryColumnFromLayer({
      layer: bound,
      columnId: bound.geoBinding.latitude,
    })!;
    // A freshly built QueryColumn for the same base column, which is what the
    // multi-select hands back: same baseColumn, different generated id.
    const rebuilt = QueryColumn.makeFromDatasetColumn(
      latitudeColumn.baseColumn as DatasetColumn.T,
    );
    const updatedLayer = MapLayerUpdates.withPopupColumns({
      layer: bound,
      columns: [rebuilt],
    });
    expect(updatedLayer.source.queryColumns).toHaveLength(2);
    expect(updatedLayer.popup.columnIds).toEqual([latitudeColumn.id]);
  });
});

describe("withDataSource", () => {
  it("resets an explicit popup selection when the source changes", () => {
    const popupColumn = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const layer = MapLayerUpdates.withPopupColumns({
      layer: _createBoundLayer(),
      columns: [popupColumn],
    });

    const updatedLayer = MapLayerUpdates.withDataSource({
      layer: layer,
      dataSource: _createDataset(),
    });

    expect(updatedLayer.popup).toEqual({ columnIds: "all", action: undefined });
  });
});

describe("geometry-column updates", () => {
  it("switches from coordinates and selects the required geometry column", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("shape"),
    );
    const updatedLayer = MapLayerUpdates.withGeometryBindingType(
      _createBoundLayer(),
      "geometryColumn",
      geometry,
    );

    expect(updatedLayer.geoBinding).toEqual({
      type: "geometryColumn",
      column: geometry.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
    });
    expect(updatedLayer.source.queryColumns).toContain(geometry);
  });

  it("defaults line geometry to simplification and line symbology", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("shape"),
    );
    const pointLayer = MapLayerUpdates.withGeometryBindingType(
      _createBoundLayer(),
      "geometryColumn",
      geometry,
    );
    const updatedLayer = MapLayerUpdates.withGeometryFamily(pointLayer, "line");

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "geometryColumn",
      family: "line",
      simplification: { tolerancePixels: 0.75 },
    });
    expect(updatedLayer.symbology.type).toBe("line");
  });

  it("switches polygon geometry to fill and clears it when coordinates return", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("shape"),
    );
    const geometryLayer = MapLayerUpdates.withGeometryFamily(
      MapLayerUpdates.withGeometryBindingType(
        _createBoundLayer(),
        "geometryColumn",
        geometry,
      ),
      "polygon",
    );
    const updatedLayer = MapLayerUpdates.withGeometryBindingType(
      geometryLayer,
      "latLngColumns",
    );

    expect(updatedLayer.geoBinding).toEqual({
      type: "latLngColumns",
      latitude: undefined,
      longitude: undefined,
    });
    expect(updatedLayer.symbology.type).toBe("circle");
  });

  it("preserves identity for unchanged geometry settings", () => {
    const geometry = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("shape"),
    );
    const layer = MapLayerUpdates.withGeometryBindingType(
      _createBoundLayer(),
      "geometryColumn",
      geometry,
    );

    expect(MapLayerUpdates.withGeometryColumn(layer, geometry)).toBe(layer);
    expect(MapLayerUpdates.withGeometryEncoding(layer, "wkt")).toBe(layer);
    expect(MapLayerUpdates.withGeometryFamily(layer, "point")).toBe(layer);
    expect(MapLayerUpdates.withGeometrySimplification(layer, undefined)).toBe(
      layer,
    );
  });
});

describe("boundary join updates", () => {
  it("creates a complete join and selects its source key", () => {
    const dataKeyColumn = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("district"),
    );
    const boundaryDataset = _createDataset();
    const geometryColumn = _createNumericColumn("shape");
    const boundaryKeyColumn = _createNumericColumn("pcode");
    const updatedLayer = MapLayerUpdates.withBoundaryJoin(
      MapLayer.makeEmpty("Districts"),
      {
        dataKeyColumn,
        matching: "exact",
        boundary: {
          datasetId: boundaryDataset.id,
          geometryColumnId: geometryColumn.id,
          geometryEncoding: "wkt",
          keyColumnId: boundaryKeyColumn.id,
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
      },
    );

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "joinToBoundaries",
      dataKeyColumn: dataKeyColumn.id,
      matching: "exact",
      aggregation: { operation: "count" },
    });
    expect(updatedLayer.source.queryColumns).toContain(dataKeyColumn);
    expect(updatedLayer.symbology.type).toBe("fill");
  });

  it("preserves aggregation identity when operation and measure change", () => {
    const dataKeyColumn = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("district"),
    );
    const measureColumn = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const boundaryDataset = _createDataset();
    const joined = MapLayerUpdates.withBoundaryJoin(
      MapLayer.makeEmpty("Districts"),
      {
        dataKeyColumn,
        matching: "exact",
        boundary: {
          datasetId: boundaryDataset.id,
          geometryColumnId: _createNumericColumn("shape").id,
          geometryEncoding: "wkt",
          keyColumnId: _createNumericColumn("pcode").id,
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
      },
    );
    const originalBinding = joined.geoBinding;
    if (originalBinding?.type !== "joinToBoundaries") {
      throw new Error("Expected a boundary join");
    }
    const updatedLayer = MapLayerUpdates.withAreaAggregation(joined, {
      operation: "sum",
      measureColumn,
    });

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "joinToBoundaries",
      aggregation: {
        operation: "sum",
        measureColumn: measureColumn.id,
        outputValueId: originalBinding.aggregation.outputValueId,
      },
    });
    expect(updatedLayer.source.queryColumns).toContain(measureColumn);
  });
});

describe("withDefaultPopupColumns", () => {
  it("materializes the source's columns the first time geometry binds", () => {
    const bound = _createBoundLayer();
    const extra = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const updatedLayer = MapLayerUpdates.withDefaultPopupColumns({
      layer: bound,
      availableColumns: [...bound.source.queryColumns, extra],
    });
    expect(updatedLayer.popup.columnIds).toContain(extra.id);
  });

  it("leaves an explicit selection alone", () => {
    const chosen = MapLayerUpdates.withPopupColumns({
      layer: _createBoundLayer(),
      columns: [],
    });
    expect(
      MapLayerUpdates.withDefaultPopupColumns({
        layer: chosen,
        availableColumns: [
          QueryColumn.makeFromDatasetColumn(_createNumericColumn("cases")),
        ],
      }),
    ).toBe(chosen);
  });
});

describe("withSymbology", () => {
  it("carries a single color from a circle to a proportional symbol", () => {
    const column = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const layer = MapLayerUpdates.withSymbolColor({
      layer: MapLayer.makeEmpty("Cases"),
      color: "#eb6834",
    });
    const updatedLayer = MapLayerUpdates.withSymbologyType({
      layer: layer,
      change: {
        nextType: "proportionalSymbol",
        valueColumn: column,
        remembered: undefined,
      },
    });
    expect(updatedLayer.symbology.color).toEqual({
      type: "single",
      color: "#eb6834",
    });
  });

  it("maps a circle's radius onto the proportional symbol's largest radius", () => {
    const layer = MapLayerUpdates.withCircleRadius({
      layer: MapLayer.makeEmpty("Cases"),
      radius: 11,
    });
    const updatedLayer = MapLayerUpdates.withSymbologyType({
      layer: layer,
      change: {
        nextType: "proportionalSymbol",
        valueColumn: QueryColumn.makeFromDatasetColumn(
          _createNumericColumn("cases"),
        ),
        remembered: undefined,
      },
    });
    expect(
      updatedLayer.symbology.type === "proportionalSymbol" &&
        updatedLayer.symbology.maxRadius,
    ).toBe(11);
  });

  it("restores a remembered symbology of the target type", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const remembered = {
      type: "circle" as const,
      radius: 3,
      color: { type: "single" as const, color: "#008300" },
      stroke: { width: 2, color: "#ffffff" },
    };
    const updatedLayer = MapLayerUpdates.withSymbologyType({
      layer: layer,
      change: {
        nextType: "circle",
        valueColumn: undefined,
        remembered,
      },
    });
    expect(updatedLayer.symbology).toEqual(remembered);
  });
});

describe("classification updates", () => {
  it("sets graduated color and clears incompatible derived legend output", () => {
    const layer = MapLayer.createArea("Districts");
    const valueColumn = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const withLegend = {
      ...layer,
      source: { ...layer.source, queryColumns: [valueColumn] },
      legend: {
        ...layer.legend,
        breaks: [{ lower: undefined, upper: 10 }],
        entries: [
          { type: "value" as const, color: "#f00", label: "< 10", count: 2 },
        ],
      },
    } satisfies MapLayer.T;

    const updated = MapLayerUpdates.withLayerColor(withLegend, {
      type: "graduated",
      value: { type: "queryColumn", column: valueColumn.id },
      ramp: ["#fee", "#f00"],
      classification: { method: "quantile", classCount: 2 },
      normalization: undefined,
      noData: { color: "#ccc", label: "" },
    });

    expect(updated.symbology.color.type).toBe("graduated");
    expect(updated.legend.breaks).toEqual([]);
    expect(updated.legend.entries).toEqual([]);
  });

  it("rejects manual breaks that are not finite and strictly increasing", () => {
    const layer = MapLayer.createArea("Districts");

    expect(MapLayerUpdates.withManualBreaks(layer, [1, 1])).toBe(layer);
    expect(MapLayerUpdates.withManualBreaks(layer, [1, Number.NaN])).toBe(
      layer,
    );
  });
});
