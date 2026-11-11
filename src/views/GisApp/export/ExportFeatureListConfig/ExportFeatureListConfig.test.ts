import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createDatasetQueryColumn } from "$/models/queries/QueryColumn/QueryColumn.fixtures";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

const NAME = createDatasetQueryColumn({
  name: "school_name",
  dataType: "varchar",
});
const RATE = createDatasetQueryColumn({
  name: "percent_immunized_measles",
  dataType: "double",
});
const LOCATION = createDatasetQueryColumn({
  name: "location",
  dataType: "varchar",
});

/** An exact point layer bound to latitude and longitude columns. */
function _pointLayer(name: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty(name),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

/** An exact "Schools" layer: name, rate, and a WKT location column. */
function _schoolsLayer(): MapLayer.T {
  const layer = MapLayer.makeEmpty("Schools");
  return {
    ...layer,
    source: { ...layer.source, queryColumns: [NAME, RATE, LOCATION] },
    geoBinding: {
      type: "geometryColumn",
      column: LOCATION.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
}

/**
 * A hydrated "Schools" layer whose popup shows all fields but whose saved
 * query holds only its WKT location column, as a geometry column layer is
 * saved before any field is chosen.
 */
function _popupAllSchoolsLayer(): MapLayer.T {
  const layer = _schoolsLayer();
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [LOCATION],
      sourceColumns: [NAME, RATE, LOCATION],
    },
    popup: { columnIds: "all", action: undefined },
  };
}

describe("ExportFeatureListConfig", () => {
  it("offers only layers whose rows can be listed, top of the stack first", () => {
    const bottom = _pointLayer("Bottom");
    const jittered = MapLayer.withSensitivity(_pointLayer("Cases"), {
      mode: "jitter",
      radiusMeters: 500,
    });
    const unbound = MapLayer.makeEmpty("Unbound");
    const buffer: MapLayer.T = {
      ...MapLayer.createArea("Buffer of Bottom"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: bottom.id,
        distanceMeters: 805,
        distanceUnit: "mi",
        labelColumn: undefined,
        dissolve: false,
      },
    };
    const top = _pointLayer("Top");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [bottom, jittered, unbound, buffer, top],
    };

    expect(
      ExportFeatureListConfig.getEligibleLayers(config).map((layer) => {
        return layer.name;
      }),
    ).toEqual(["Top", "Bottom"]);
  });

  it("offers and starts from every source column when the popup shows all fields", () => {
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [_popupAllSchoolsLayer()],
    };
    const [layer] = ExportFeatureListConfig.getEligibleLayers(config);

    expect(layer!.source.queryColumns.map(prop("id"))).toEqual(
      expect.arrayContaining([NAME.id, RATE.id]),
    );
    expect(ExportFeatureListConfig.createFromLayer(layer!).columnIds).toEqual([
      NAME.id,
      RATE.id,
    ]);
  });

  it("starts from the popup's columns when the popup lists them", () => {
    const layer = {
      ..._schoolsLayer(),
      popup: { columnIds: [RATE.id], action: undefined },
    };

    expect(ExportFeatureListConfig.createFromLayer(layer)).toEqual({
      layerId: layer.id,
      columnIds: [RATE.id],
      sort: undefined,
      maxRows: 200,
    });
  });

  it("starts from every column but the geometry when the popup shows all", () => {
    expect(
      ExportFeatureListConfig.createFromLayer(_schoolsLayer()).columnIds,
    ).toEqual([NAME.id, RATE.id]);
  });

  it("never starts from a point layer's latitude and longitude columns", () => {
    const latitude = createDatasetQueryColumn({
      name: "latitude",
      dataType: "double",
    });
    const longitude = createDatasetQueryColumn({
      name: "longitude",
      dataType: "double",
    });
    const layer = MapLayer.makeEmpty("Childcare");
    const pointLayer: MapLayer.T = {
      ...layer,
      source: {
        ...layer.source,
        queryColumns: [NAME, latitude, longitude],
      },
      geoBinding: {
        type: "latLngColumns",
        latitude: latitude.id,
        longitude: longitude.id,
      },
    };

    expect(
      ExportFeatureListConfig.createFromLayer(pointLayer).columnIds,
    ).toEqual([NAME.id]);
  });

  it("keeps the row cap and resets columns and sort when the layer changes", () => {
    const layer = _schoolsLayer();
    const otherLayer = _pointLayer("Childcare");

    expect(
      ExportFeatureListConfig.withLayer({
        featureList: {
          layerId: layer.id,
          columnIds: [NAME.id],
          sort: { columnId: NAME.id, direction: "desc" },
          maxRows: 50,
        },
        layer: otherLayer,
      }),
    ).toEqual({
      layerId: otherLayer.id,
      columnIds: [],
      sort: undefined,
      maxRows: 50,
    });
  });

  it("orders checked columns as the query does and drops an unchecked sort", () => {
    const layer = _schoolsLayer();

    expect(
      ExportFeatureListConfig.withColumns({
        featureList: {
          layerId: layer.id,
          columnIds: [NAME.id, RATE.id],
          sort: { columnId: NAME.id, direction: "asc" },
          maxRows: 200,
        },
        layer,
        selectedIds: [LOCATION.id, RATE.id],
      }),
    ).toEqual({
      layerId: layer.id,
      columnIds: [RATE.id, LOCATION.id],
      sort: undefined,
      maxRows: 200,
    });
  });

  it("sorts ascending by a chosen listed column and clears the sort for the default order", () => {
    const layer = _schoolsLayer();
    const featureList = {
      layerId: layer.id,
      columnIds: [NAME.id, RATE.id],
      sort: undefined,
      maxRows: 200,
    };
    const sorted = ExportFeatureListConfig.withSortColumn({
      featureList,
      columnId: RATE.id,
    });

    expect(sorted.sort).toEqual({ columnId: RATE.id, direction: "asc" });
    expect(
      ExportFeatureListConfig.withSortColumn({
        featureList: sorted,
        columnId: "default",
      }).sort,
    ).toBeUndefined();
  });

  it("changes the direction only of a set sort", () => {
    const layer = _schoolsLayer();
    const unsorted = {
      layerId: layer.id,
      columnIds: [NAME.id],
      sort: undefined,
      maxRows: 200,
    };

    expect(
      ExportFeatureListConfig.withSortDirection({
        featureList: unsorted,
        direction: "desc",
      }),
    ).toBe(unsorted);
    expect(
      ExportFeatureListConfig.withSortDirection({
        featureList: {
          ...unsorted,
          sort: { columnId: NAME.id, direction: "asc" },
        },
        direction: "desc",
      }).sort?.direction,
    ).toBe("desc");
  });
});
