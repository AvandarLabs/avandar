import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getQueryLayersFromMapLayers } from "@/views/GisApp/layers/getQueryLayersFromMapLayers/getQueryLayersFromMapLayers";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** A hydrated schools layer drawn from its WKT column, popup on all fields. */
function _makeSchoolsLayer(): MapLayer.T {
  const dataset = Model.make("Dataset", {
    id: "schools",
    name: "schools",
  }) as Dataset.T;
  const sourceColumns = ["the_geom", "loc_name", "address"].map(
    (name, index) => {
      return QueryColumn.makeFromDatasetColumn(
        Model.make("DatasetColumn", {
          id: `dc_${name}`,
          datasetId: dataset.id,
          name,
          originalName: name,
          dataType: "varchar",
          columnIdx: index,
        }) as DatasetColumn.T,
      );
    },
  );
  const geometryColumn = sourceColumns[0]!;
  const layer = MapLayer.makeEmpty("schools");
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: dataset,
      queryColumns: [geometryColumn],
      sourceColumns,
    },
    geoBinding: {
      type: "geometryColumn",
      column: geometryColumn.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
}

function _getQueriedNames(layer: MapLayer.T): string[] {
  const [queryLayer] = getQueryLayersFromMapLayers([layer]);
  return queryLayer!.source.queryColumns.map(prop("baseColumn.name"));
}

describe("getQueryLayersFromMapLayers", () => {
  it("queries every source column of an exact layer whose popup shows all fields", () => {
    expect(_getQueriedNames(_makeSchoolsLayer())).toEqual([
      "the_geom",
      "loc_name",
      "address",
    ]);
  });

  it("keeps the source columns' ids, so the layer's query key is stable", () => {
    const layer = _makeSchoolsLayer();
    const [queryLayer] = getQueryLayersFromMapLayers([layer]);

    expect(queryLayer!.source.queryColumns.map(prop("id"))).toEqual(
      layer.source.sourceColumns!.map(prop("id")),
    );
  });

  it("never widens a layer whose locations are displaced", () => {
    const displaced = MapLayer.withSensitivity(_makeSchoolsLayer(), {
      mode: "jitter",
      radiusMeters: 500,
    });

    expect(_getQueriedNames(displaced)).toEqual(["the_geom"]);
  });

  it("leaves a popup's chosen fields as the only queried columns", () => {
    const layer = _makeSchoolsLayer();
    const chosen = { ...layer, popup: { ...layer.popup, columnIds: [] } };

    expect(_getQueriedNames(chosen)).toEqual(["the_geom"]);
  });

  it("leaves an aggregated query alone", () => {
    const layer = _makeSchoolsLayer();
    const geometryId = layer.source.queryColumns[0]!.id;
    const aggregated = {
      ...layer,
      source: {
        ...layer.source,
        aggregations: { [geometryId]: "count" as const },
      },
    };

    expect(_getQueriedNames(aggregated)).toEqual(["the_geom"]);
  });

  it("returns an unchanged layer itself", () => {
    const layer = MapLayer.makeEmpty("unbound");

    expect(getQueryLayersFromMapLayers([layer])[0]).toBe(layer);
  });
});
