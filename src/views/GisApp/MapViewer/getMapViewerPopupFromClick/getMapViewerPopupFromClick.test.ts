import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { getMapViewerPopupFromClick } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";

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
      }),
    ).toBeUndefined();
  });
});
