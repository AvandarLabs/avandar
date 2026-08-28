import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { createNumericColumn } from "./MapLayerUpdates.fixtures";

describe("classification updates", () => {
  it("sets graduated color and clears incompatible derived legend output", () => {
    const layer = MapLayer.createArea("Districts");
    const valueColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
    );
    const withLegend = {
      ...layer,
      source: { ...layer.source, queryColumns: [valueColumn] },
      legend: {
        ...layer.legend,
        breaks: [{ lower: undefined, upper: 10 }],
        entries: [
          { type: "value" as const, color: "#f00", label: "< 10", count: 2 },
        ],
      },
    } satisfies MapLayer.T;

    const updated = MapLayerUpdates.withLayerColor({
      layer: withLegend,
      color: {
        type: "graduated",
        value: { type: "queryColumn", column: valueColumn.id },
        ramp: ["#fee", "#f00"],
        classification: { method: "quantile", classCount: 2 },
        normalization: undefined,
        noData: { color: "#ccc", label: "" },
      },
    });

    expect(updated.symbology).toMatchObject({
      color: { type: "graduated" },
    });
    expect(updated.legend.breaks).toEqual([]);
    expect(updated.legend.entries).toEqual([]);
  });

  it("rejects manual breaks that are not finite and strictly increasing", () => {
    const layer = MapLayer.createArea("Districts");

    expect(MapLayerUpdates.withManualBreaks({ layer, breaks: [1, 1] })).toBe(
      layer,
    );
    expect(
      MapLayerUpdates.withManualBreaks({ layer, breaks: [1, Number.NaN] }),
    ).toBe(layer);
  });
});
