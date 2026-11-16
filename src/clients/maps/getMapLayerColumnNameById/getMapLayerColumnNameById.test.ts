import { describe, expect, it } from "vitest";
import { getMapLayerColumnNameById } from "@/clients/maps/getMapLayerColumnNameById/getMapLayerColumnNameById";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

describe("getMapLayerColumnNameById", () => {
  it("names a queried column the way the layer's query results do", () => {
    const layer = createQueryableLayer();
    const [latitude] = layer.source.queryColumns;

    expect(getMapLayerColumnNameById(layer, latitude!.id)).toBe("lat");
  });

  it("returns undefined for a column the layer does not query", () => {
    expect(
      getMapLayerColumnNameById(
        createQueryableLayer(),
        "00000000-0000-4000-8000-0000000000ff" as QueryColumn.Id,
      ),
    ).toBeUndefined();
  });
});
