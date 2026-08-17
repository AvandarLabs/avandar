import { prop } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import {
  createBoundLayer,
  createDataset,
  createNumericColumn,
} from "./MapLayerUpdates.fixtures";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

describe("withPopupColumns", () => {
  it("selects the columns and adds them to the layer's query", () => {
    const column = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
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
    const bound = createBoundLayer();
    expect(bound.geoBinding?.type).toBe("latLngColumns");
    if (bound.geoBinding?.type !== "latLngColumns") {
      return;
    }
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
      createNumericColumn("cases"),
    );
    const bound = MapLayerUpdates.withPopupColumns({
      layer: createBoundLayer(),
      columns: [extra],
    });
    const updatedLayer = MapLayerUpdates.withPopupColumns({
      layer: bound,
      columns: [],
    });
    expect(updatedLayer.source.queryColumns).not.toContain(extra);
  });

  it("does not select the same base column twice under two ids", () => {
    const bound = createBoundLayer();
    expect(bound.geoBinding?.type).toBe("latLngColumns");
    if (bound.geoBinding?.type !== "latLngColumns") {
      return;
    }
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
      createNumericColumn("cases"),
    );
    const layer = MapLayerUpdates.withPopupColumns({
      layer: createBoundLayer(),
      columns: [popupColumn],
    });

    const updatedLayer = MapLayerUpdates.withDataSource({
      layer: layer,
      dataSource: createDataset(),
    });

    expect(updatedLayer.popup).toEqual({ columnIds: "all", action: undefined });
  });
});

describe("withDefaultPopupColumns", () => {
  it("materializes the source's columns the first time geometry binds", () => {
    const bound = createBoundLayer();
    const extra = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
    );
    const updatedLayer = MapLayerUpdates.withDefaultPopupColumns({
      layer: bound,
      availableColumns: [...bound.source.queryColumns, extra],
    });
    expect(updatedLayer.popup.columnIds).toContain(extra.id);
  });

  it("leaves an explicit selection alone", () => {
    const chosen = MapLayerUpdates.withPopupColumns({
      layer: createBoundLayer(),
      columns: [],
    });
    expect(
      MapLayerUpdates.withDefaultPopupColumns({
        layer: chosen,
        availableColumns: [
          QueryColumn.makeFromDatasetColumn(createNumericColumn("cases")),
        ],
      }),
    ).toBe(chosen);
  });
});
