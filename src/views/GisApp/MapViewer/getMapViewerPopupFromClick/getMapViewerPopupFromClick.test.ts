import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { getMapViewerPopupFromClick } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const NO_PLACES: ReadonlySet<Dataset.Id> = new Set();
const LAYER = MapLayer.makeEmpty("Schools");
const CONFIG = AvaMapConfig.withLayerAdded({
  config: AvaMapConfig.makeEmpty(),
  layer: LAYER,
});
const FEATURE: GeoJSON.Feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [0, 0] },
  properties: {
    school_name: "PS 11",
    enrolled: 412,
    __avandar_feature_id: "f-1",
  },
};

describe("getMapViewerPopupFromClick", () => {
  it("lists a clicked feature's columns without render bookkeeping", () => {
    expect(
      getMapViewerPopupFromClick({
        config: CONFIG,
        feature: FEATURE,
        renderedLayerId: MapLayerIds.toLayerId(LAYER.id),
        placesDatasetIds: NO_PLACES,
      }),
    ).toEqual({
      layerName: "Schools",
      rows: [
        { name: "school_name", value: "PS 11" },
        { name: "enrolled", value: "412" },
      ],
    });
  });

  it("ignores a click on something that is not a data layer", () => {
    expect(
      getMapViewerPopupFromClick({
        config: CONFIG,
        feature: FEATURE,
        renderedLayerId: MapLayerIds.annotationFillLayer,
        placesDatasetIds: NO_PLACES,
      }),
    ).toBeUndefined();
  });

  it("hides MapLibre cluster bookkeeping", () => {
    const popup = getMapViewerPopupFromClick({
      config: CONFIG,
      feature: {
        ...FEATURE,
        properties: { ...FEATURE.properties, cluster: true, cluster_id: 7 },
      },
      renderedLayerId: MapLayerIds.toLayerId(LAYER.id),
      placesDatasetIds: NO_PLACES,
    });

    expect(
      popup?.rows.map((row) => {
        return row.name;
      }),
    ).toEqual(["school_name", "enrolled"]);
  });

  describe("location and place fields", () => {
    const dataset = Model.make("Dataset", {
      id: "places-ds",
      name: "places",
    }) as Dataset.T;
    const columns = ["lat", "lng", "name", "place_id"].map(
      (name, columnIdx) => {
        return QueryColumn.makeFromDatasetColumn(
          Model.make("DatasetColumn", {
            id: `dc_${name}`,
            datasetId: dataset.id,
            name,
            originalName: name,
            dataType: "varchar",
            columnIdx,
          }) as DatasetColumn.T,
        );
      },
    );
    const feature: GeoJSON.Feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: { lat: 1, lng: 2, name: "Clinic", place_id: "p-1" },
    };

    function _popupNames(
      columnIds: "all" | string[],
      placesDatasetIds: ReadonlySet<Dataset.Id>,
    ): string[] | undefined {
      const base = MapLayer.makeEmpty("Clinics");
      const layer: MapLayer.T = {
        ...base,
        source: {
          ...base.source,
          dataSource: dataset,
          queryColumns: columns,
          sourceColumns: columns,
        },
        geoBinding: {
          type: "latLngColumns",
          latitude: columns[0]!.id,
          longitude: columns[1]!.id,
        } as MapLayer.T["geoBinding"],
        popup: { ...base.popup, columnIds: columnIds as never },
      };
      return getMapViewerPopupFromClick({
        config: AvaMapConfig.withLayerAdded({
          config: AvaMapConfig.makeEmpty(),
          layer,
        }),
        feature,
        renderedLayerId: MapLayerIds.toLayerId(layer.id),
        placesDatasetIds,
      })?.rows.map((row) => {
        return row.name;
      });
    }

    it("hides bound lat/lng columns when the popup shows all fields", () => {
      expect(_popupNames("all", NO_PLACES)).toEqual(["name", "place_id"]);
    });

    it("hides bound lat/lng columns even when the popup lists them", () => {
      expect(_popupNames([columns[0]!.id, columns[2]!.id], NO_PLACES)).toEqual([
        "name",
      ]);
    });

    it("hides place_id on a places layer", () => {
      expect(_popupNames("all", new Set([dataset.id]))).toEqual(["name"]);
    });
  });
});
