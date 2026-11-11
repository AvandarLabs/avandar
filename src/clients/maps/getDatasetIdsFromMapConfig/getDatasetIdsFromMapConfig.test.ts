import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getDatasetIdsFromMapConfig } from "@/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

describe("getDatasetIdsFromMapConfig", () => {
  it("lists each source and boundary dataset once", () => {
    const points = createQueryableLayer();
    const boundaryDatasetId = uuid<Dataset.Id>();
    const zips: MapLayer.T = {
      ...MapLayer.createArea("ZIP codes"),
      geoBinding: {
        type: "joinToBoundaries",
        dataKeyColumn: uuid<QueryColumn.Id>(),
        boundary: {
          datasetId: boundaryDatasetId,
          geometryColumnId: uuid<DatasetColumn.Id>(),
          geometryEncoding: "wkt",
          keyColumnId: uuid<DatasetColumn.Id>(),
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 1 },
        },
        matching: "exact",
        aggregation: {
          operation: "count",
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
      },
    };
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [points, { ...points, id: uuid<MapLayer.Id>() }, zips],
    };

    expect(getDatasetIdsFromMapConfig(config)).toEqual([
      points.source.dataSource!.id,
      boundaryDatasetId,
    ]);
  });
});
