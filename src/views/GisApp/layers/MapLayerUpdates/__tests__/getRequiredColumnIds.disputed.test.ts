import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { getRequiredColumnIds } from "@/views/GisApp/layers/MapLayerUpdates/getRequiredColumnIds";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

describe("getRequiredColumnIds with a disputed bind", () => {
  it("keeps a query-column disputed bind in the query", () => {
    const column = uuid<QueryColumn.Id>();
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      disputedStatusColumn: { type: "queryColumn", column },
    };

    expect(getRequiredColumnIds(layer).has(column)).toBe(true);
  });

  it("does not require a boundary-column bind from the source query", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      disputedStatusColumn: {
        type: "boundaryColumn",
        column: uuid<DatasetColumn.Id>(),
      },
    };

    expect(getRequiredColumnIds(layer).size).toBe(0);
  });
});
