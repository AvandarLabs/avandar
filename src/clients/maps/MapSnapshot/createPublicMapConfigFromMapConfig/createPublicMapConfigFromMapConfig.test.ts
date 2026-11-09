import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { createPublicMapConfigFromMapConfig } from "@/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig/createPublicMapConfigFromMapConfig";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";

describe("createPublicMapConfigFromMapConfig", () => {
  it("drops each layer's data source and filters but keeps its columns", () => {
    const layer = createQueryableLayer();
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer,
    });

    const publicLayer = createPublicMapConfigFromMapConfig(config).layers[0]!;

    expect(publicLayer.source.dataSource).toBeUndefined();
    expect(publicLayer.source.filters).toEqual(
      StructuredQuery.makeEmpty().filters,
    );
    expect(publicLayer.source.queryColumns).toEqual(layer.source.queryColumns);
    expect(publicLayer.geoBinding).toEqual(layer.geoBinding);
  });
});
