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
    const updatedLayer = MapLayerUpdates.withPopupColumns(layer, [column]);
    expect(updatedLayer.popup.columnIds).toEqual([column.id]);
    expect(updatedLayer.source.queryColumns).toContain(column);
  });

  it("keeps a column the geometry binding needs when it is deselected", () => {
    const bound = _createBoundLayer();
    const updatedLayer = MapLayerUpdates.withPopupColumns(bound, []);
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
    const bound = MapLayerUpdates.withPopupColumns(_createBoundLayer(), [
      extra,
    ]);
    const updatedLayer = MapLayerUpdates.withPopupColumns(bound, []);
    expect(updatedLayer.source.queryColumns).not.toContain(extra);
  });

  it("does not select the same base column twice under two ids", () => {
    const bound = _createBoundLayer();
    const latitudeColumn = MapLayerUpdates.findQueryColumn(
      bound,
      bound.geoBinding!.latitude,
    )!;
    // A freshly built QueryColumn for the same base column, which is what the
    // multi-select hands back: same baseColumn, different generated id.
    const rebuilt = QueryColumn.makeFromDatasetColumn(
      latitudeColumn.baseColumn as DatasetColumn.T,
    );
    const updatedLayer = MapLayerUpdates.withPopupColumns(bound, [rebuilt]);
    expect(updatedLayer.source.queryColumns).toHaveLength(2);
    expect(updatedLayer.popup.columnIds).toEqual([latitudeColumn.id]);
  });
});

describe("withDataSource", () => {
  it("resets an explicit popup selection when the source changes", () => {
    const popupColumn = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const layer = MapLayerUpdates.withPopupColumns(_createBoundLayer(), [
      popupColumn,
    ]);

    const updatedLayer = MapLayerUpdates.withDataSource(
      layer,
      _createDataset(),
    );

    expect(updatedLayer.popup).toEqual({ columnIds: "all", action: undefined });
  });
});

describe("withDefaultPopupColumns", () => {
  it("materializes the source's columns the first time geometry binds", () => {
    const bound = _createBoundLayer();
    const extra = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const updatedLayer = MapLayerUpdates.withDefaultPopupColumns(bound, [
      ...bound.source.queryColumns,
      extra,
    ]);
    expect(updatedLayer.popup.columnIds).toContain(extra.id);
  });

  it("leaves an explicit selection alone", () => {
    const chosen = MapLayerUpdates.withPopupColumns(_createBoundLayer(), []);
    expect(
      MapLayerUpdates.withDefaultPopupColumns(chosen, [
        QueryColumn.makeFromDatasetColumn(_createNumericColumn("cases")),
      ]),
    ).toBe(chosen);
  });
});

describe("withSymbology", () => {
  it("carries a single color from a circle to a proportional symbol", () => {
    const column = QueryColumn.makeFromDatasetColumn(
      _createNumericColumn("cases"),
    );
    const layer = MapLayerUpdates.withSymbolColor(
      MapLayer.makeEmpty("Cases"),
      "#eb6834",
    );
    const updatedLayer = MapLayerUpdates.withSymbologyType(layer, {
      nextType: "proportionalSymbol",
      valueColumn: column,
      remembered: undefined,
    });
    expect(updatedLayer.symbology.color).toEqual({
      type: "single",
      color: "#eb6834",
    });
  });

  it("maps a circle's radius onto the proportional symbol's largest radius", () => {
    const layer = MapLayerUpdates.withCircleRadius(
      MapLayer.makeEmpty("Cases"),
      11,
    );
    const updatedLayer = MapLayerUpdates.withSymbologyType(layer, {
      nextType: "proportionalSymbol",
      valueColumn: QueryColumn.makeFromDatasetColumn(
        _createNumericColumn("cases"),
      ),
      remembered: undefined,
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
    const updatedLayer = MapLayerUpdates.withSymbologyType(layer, {
      nextType: "circle",
      valueColumn: undefined,
      remembered,
    });
    expect(updatedLayer.symbology).toEqual(remembered);
  });
});
