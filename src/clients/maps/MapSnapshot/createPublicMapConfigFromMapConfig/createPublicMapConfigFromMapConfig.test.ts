import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { createPublicMapConfigFromMapConfig } from "@/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig/createPublicMapConfigFromMapConfig";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";

function _createConfig(layers: readonly MapLayer.T[]): AvaMapConfig.T {
  return layers.reduce((config, layer) => {
    return AvaMapConfig.withLayerAdded({ config, layer });
  }, AvaMapConfig.makeEmpty());
}

describe("createPublicMapConfigFromMapConfig", () => {
  it("drops each layer's data source and filters but keeps its column names", () => {
    const layer = createQueryableLayer();

    const publicLayer = createPublicMapConfigFromMapConfig({
      config: _createConfig([layer]),
      publishedLayerIds: new Set([layer.id]),
    }).layers[0]!;

    expect(publicLayer.source.dataSource).toBeUndefined();
    expect(publicLayer.source.filters).toEqual(
      StructuredQuery.makeEmpty().filters,
    );
    expect(
      publicLayer.source.queryColumns.map(QueryColumn.getDerivedColumnName),
    ).toEqual(layer.source.queryColumns.map(QueryColumn.getDerivedColumnName));
    expect(publicLayer.geoBinding).toEqual(layer.geoBinding);
  });

  it("keeps only the published layers", () => {
    const published = createQueryableLayer();
    const hidden = { ...createQueryableLayer(), isVisible: false };

    const publicConfig = createPublicMapConfigFromMapConfig({
      config: _createConfig([hidden, published]),
      publishedLayerIds: new Set([published.id]),
    });

    expect(
      publicConfig.layers.map((layer) => {
        return layer.id;
      }),
    ).toEqual([published.id]);
  });

  it("drops the dataset column metadata behind each query column", () => {
    const layer = createQueryableLayer();

    const publicLayer = createPublicMapConfigFromMapConfig({
      config: _createConfig([layer]),
      publishedLayerIds: new Set([layer.id]),
    }).layers[0]!;

    publicLayer.source.queryColumns.forEach((column) => {
      expect(Object.keys(column.baseColumn).sort()).toEqual([
        "__type",
        "dataType",
        "name",
      ]);
    });
  });

  it("keeps a displaced layer's mode without its radius", () => {
    const layer = MapLayer.withSensitivity(createQueryableLayer(), {
      mode: "jitter",
      radiusMeters: 750,
    });

    const publicLayer = createPublicMapConfigFromMapConfig({
      config: _createConfig([layer]),
      publishedLayerIds: new Set([layer.id]),
    }).layers[0]!;

    expect(publicLayer.sensitivity).toEqual({
      mode: "jitter",
      radiusMeters: 0,
    });
  });
});
