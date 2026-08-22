import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import {
  createBoundLayer,
  createNumericColumn,
  createTextColumn,
} from "./MapLayerUpdates.fixtures";

describe("time-column updates", () => {
  it("binds a text column that is already on the layer query", () => {
    const layer = createBoundLayer();
    const occurredOn = QueryColumn.makeFromDatasetColumn(
      createTextColumn("occurred_on"),
    );
    const layerWithColumn = {
      ...layer,
      source: {
        ...layer.source,
        queryColumns: [...layer.source.queryColumns, occurredOn],
      },
    };
    const updatedLayer = MapLayerUpdates.withTimeColumn({
      layer: layerWithColumn,
      column: occurredOn,
    });

    expect(updatedLayer.timeColumn).toBe(occurredOn.id);
  });

  it("does not bind a numeric column", () => {
    const layer = createBoundLayer();
    const count = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("count"),
    );
    const layerWithColumn = {
      ...layer,
      source: {
        ...layer.source,
        queryColumns: [...layer.source.queryColumns, count],
      },
    };
    const updatedLayer = MapLayerUpdates.withTimeColumn({
      layer: layerWithColumn,
      column: count,
    });

    expect(updatedLayer).toBe(layerWithColumn);
    expect(updatedLayer.timeColumn).toBeUndefined();
  });

  it("does not bind a column missing from the layer query", () => {
    const layer = createBoundLayer();
    const occurredOn = QueryColumn.makeFromDatasetColumn(
      createTextColumn("occurred_on"),
    );
    const updatedLayer = MapLayerUpdates.withTimeColumn({
      layer,
      column: occurredOn,
    });

    expect(updatedLayer).toBe(layer);
  });

  it("clears the time column", () => {
    const layer = createBoundLayer();
    const occurredOn = QueryColumn.makeFromDatasetColumn(
      createTextColumn("occurred_on"),
    );
    const boundLayer = {
      ...layer,
      source: {
        ...layer.source,
        queryColumns: [...layer.source.queryColumns, occurredOn],
      },
      timeColumn: occurredOn.id,
    };
    const updatedLayer = MapLayerUpdates.withTimeColumn({
      layer: boundLayer,
      column: undefined,
    });

    expect(updatedLayer.timeColumn).toBeUndefined();
  });
});
