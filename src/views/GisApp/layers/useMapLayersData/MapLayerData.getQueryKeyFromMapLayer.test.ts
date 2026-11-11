import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import {
  createSpatialLayer,
  UNIT_SQUARE,
} from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";

const { MapLayerData } =
  await import("@/views/GisApp/layers/useMapLayersData/MapLayerData");

describe("MapLayerData.getQueryKeyFromMapLayer", () => {
  it("changes when the source changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withLimit = { ...layer, source: { ...layer.source, limit: 500 } };
    expect(MapLayerData.getQueryKeyFromMapLayer(layer)).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(withLimit),
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
    expect(MapLayerData.getQueryKeyFromMapLayer(layer)).toEqual(
      MapLayerData.getQueryKeyFromMapLayer(recolored),
    );
  });

  it("changes when the time column changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withTimeColumn = {
      ...layer,
      timeColumn: uuid<QueryColumn.Id>(),
    };
    expect(MapLayerData.getQueryKeyFromMapLayer(layer)).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(withTimeColumn),
    );
  });

  it("changes when the overlay time range changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const january = {
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-31T23:59:59.000Z",
    };
    expect(
      MapLayerData.getQueryKeyFromMapLayer(layer, undefined, {
        aoi: undefined,
        timeRange: undefined,
      }),
    ).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(layer, undefined, {
        aoi: undefined,
        timeRange: january,
      }),
    );
  });

  it("changes when the overlay aoi changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const aoi = UNIT_SQUARE;
    expect(
      MapLayerData.getQueryKeyFromMapLayer(layer, undefined, {
        aoi: undefined,
        timeRange: undefined,
      }),
    ).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(layer, undefined, {
        aoi,
        timeRange: undefined,
      }),
    );
  });

  it("changes a buffer key when the source overlay participation changes", () => {
    const source = createSpatialLayer();
    const buffer = MapLayer.withSensitivity(
      {
        ...MapLayer.createArea("Buffer"),
        geoBinding: {
          type: "bufferOfLayer",
          layerId: source.id,
          distanceMeters: 1000,
          distanceUnit: "m",
          labelColumn: undefined,
          dissolve: false,
        },
      },
      source.sensitivity,
    );
    const stack = [source, buffer];
    const sourceIgnoringAoi = { ...source, applyAoiFilter: false };

    expect(
      MapLayerData.getQueryKeyFromMapLayer(buffer, undefined, undefined, stack),
    ).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(buffer, undefined, undefined, [
        sourceIgnoringAoi,
        buffer,
      ]),
    );
  });
});

describe("MapLayerData.getQueryKeyFromMapLayer spatial filters", () => {
  it("changes when the filter layer's source changes", () => {
    const filterLayer = MapLayer.createArea("Buffer of Sites");
    const schools = {
      ...MapLayer.makeEmpty("Schools"),
      spatialFilter: { layerId: filterLayer.id },
    };
    const editedFilterLayer = {
      ...filterLayer,
      source: { ...filterLayer.source, limit: 10 },
    };

    expect(
      MapLayerData.getQueryKeyFromMapLayer(schools, undefined, undefined, [
        filterLayer,
        schools,
      ]),
    ).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(schools, undefined, undefined, [
        editedFilterLayer,
        schools,
      ]),
    );
  });

  it("changes when a layer further down the filter chain changes", () => {
    const zipCodes = MapLayer.createArea("ZIP codes");
    const sites = {
      ...MapLayer.createArea("Buffer of Sites"),
      spatialFilter: { layerId: zipCodes.id },
    };
    const schools = {
      ...MapLayer.makeEmpty("Schools"),
      spatialFilter: { layerId: sites.id },
    };
    const editedZipCodes = {
      ...zipCodes,
      source: { ...zipCodes.source, limit: 10 },
    };

    expect(
      MapLayerData.getQueryKeyFromMapLayer(schools, undefined, undefined, [
        zipCodes,
        sites,
        schools,
      ]),
    ).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(schools, undefined, undefined, [
        editedZipCodes,
        sites,
        schools,
      ]),
    );
  });

  it("leaves an unfiltered layer's key unchanged by other stacked layers", () => {
    const cases = MapLayer.makeEmpty("Cases");
    const zipCodes = MapLayer.createArea("ZIP codes");

    expect(
      MapLayerData.getQueryKeyFromMapLayer(cases, undefined, undefined, [
        zipCodes,
        cases,
      ]),
    ).toEqual(MapLayerData.getQueryKeyFromMapLayer(cases));
  });
});
