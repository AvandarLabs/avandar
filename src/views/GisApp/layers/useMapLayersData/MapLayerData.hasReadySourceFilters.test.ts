import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

describe("MapLayerData.hasReadySourceFilters", () => {
  it("waits for the spatial filter layer's saved filters to hydrate", () => {
    const area = MapLayer.createArea("ZIP codes");
    const filterLayer: MapLayer.T = {
      ...area,
      source: {
        ...area.source,
        sourceColumns: undefined,
        filters: {
          type: "group",
          combinator: "AND",
          rules: [
            {
              type: "rule",
              columnId: uuid<QueryColumn.Id>(),
              operator: "=",
              value: "Manhattan",
            },
          ],
        },
      },
    };
    const schools = {
      ...MapLayer.makeEmpty("Schools"),
      spatialFilter: { layerId: filterLayer.id },
    };

    expect(
      MapLayerData.hasReadySourceFilters({
        layer: schools,
        stack: [filterLayer, schools],
      }),
    ).toBe(false);
  });
});
