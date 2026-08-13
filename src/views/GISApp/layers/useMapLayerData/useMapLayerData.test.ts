import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { describe, expect, it } from "vitest";
import {
  buildMapLayerQueryKey,
  isMapLayerQueryable,
} from "@/views/GISApp/layers/useMapLayerData/useMapLayerData";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * An honest `DatasetColumnRead`, built with no cast. Mirrors the fixture in
 * `MapLayerModule.test.ts`: `dataType` is a real `AvaDataType` ("double"),
 * not a loose "number", and the id field is `columnIdx`, not `columnIndex`.
 */
function createNumericColumn(name: string): DatasetColumnRead {
  const now = new Date().toISOString();
  return {
    __type: "DatasetColumn",
    id: uuid<DatasetColumnId>(),
    datasetId: uuid<DatasetId>(),
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
  };
}

describe("isMapLayerQueryable", () => {
  it("is false until the layer has a data source", () => {
    expect(isMapLayerQueryable(MapLayer.makeEmpty("Cases"))).toBe(false);
  });

  it("is false when the layer has a source but no resolvable geo binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withSource = {
      ...layer,
      source: { ...layer.source, dataSource: { __type: "Dataset", id: "d1" } },
    } as never;
    expect(isMapLayerQueryable(withSource)).toBe(false);
  });
});

describe("buildMapLayerQueryKey", () => {
  it("changes when the source changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withLimit = { ...layer, source: { ...layer.source, limit: 500 } };
    expect(buildMapLayerQueryKey(layer)).not.toEqual(
      buildMapLayerQueryKey(withLimit),
    );
  });

  it("does not change when only symbology changes, so repaint skips refetch", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const recolored = {
      ...layer,
      symbology: {
        ...layer.symbology,
        color: { type: "single" as const, color: "#ef4444" },
      },
    };
    expect(buildMapLayerQueryKey(layer)).toEqual(
      buildMapLayerQueryKey(recolored),
    );
  });
});

describe("compiled SQL for a lat/lng layer", () => {
  it("uses no spatial function", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lon"),
    );
    const query = {
      ...StructuredQuery.makeEmpty(),
      dataSource: { __type: "Dataset", id: "dataset-1" },
      queryColumns: [latitude, longitude],
    } as never;

    expect(StructuredQuery.toRawDuckDBQuery(query)).not.toMatch(/ST_/i);
  });
});
