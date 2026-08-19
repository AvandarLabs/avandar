import { uuid } from "$/lib/uuid";
import { describe, expect, it } from "vitest";
import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import {
  EMPTY_STATS,
  makeFillLayerFixture,
} from "./makeLayerSpecFromMapLayer.fixtures";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _boundLayer() {
  return {
    ...makeFillLayerFixture(),
    disputedStatusColumn: {
      type: "queryColumn" as const,
      column: uuid<QueryColumn.Id>(),
    },
    disputedStatusValues: {
      disputed: ["Disputed"],
      undetermined: ["Undetermined"],
    },
  };
}

const FEATURES: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: { [DisputedBoundary.propertyName]: "Disputed" },
    },
  ],
};

describe("disputed casing paint", () => {
  it("adds a dashed grey casing above the layer outline", () => {
    const spec = makeLayerSpecFromMapLayer({
      layer: _boundLayer(),
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });
    const casing = spec.layers.at(-1)!;

    expect(casing.id).toBe(
      MapLayerIds.toDisputedCasingLayerId(_boundLayer().id),
    );
    expect(casing.type).toBe("line");
    expect(casing.paint["line-color"]).toBe(
      DisputedBoundary.casingColors.light,
    );
    expect(casing.paint["line-dasharray"]).toEqual([3, 2]);
  });

  it("never paints the casing in the layer's own stroke color", () => {
    const layer = _boundLayer();
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(spec.layers.at(-1)!.paint["line-color"]).not.toBe(
      layer.symbology.stroke.color,
    );
  });

  it("filters the casing to disputed and undetermined features", () => {
    const spec = makeLayerSpecFromMapLayer({
      layer: _boundLayer(),
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(spec.layers.at(-1)!.filter).toEqual([
      "in",
      ["get", DisputedBoundary.propertyName],
      ["literal", ["Disputed", "Undetermined"]],
    ]);
  });

  it("adds no casing when the layer has no bind", () => {
    const spec = makeLayerSpecFromMapLayer({
      layer: makeFillLayerFixture(),
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(
      spec.layers.some((mapLayer) => {
        return mapLayer.id.endsWith("-disputed-casing");
      }),
    ).toBe(false);
  });

  it("adds no casing when both value arrays are empty", () => {
    const spec = makeLayerSpecFromMapLayer({
      layer: {
        ..._boundLayer(),
        disputedStatusValues: { disputed: [], undetermined: [] },
      },
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(
      spec.layers.some((mapLayer) => {
        return mapLayer.id.endsWith("-disputed-casing");
      }),
    ).toBe(false);
  });

  it("leaves the settled outline paint unchanged", () => {
    const layer = _boundLayer();
    const withBind = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });
    const withoutBind = makeLayerSpecFromMapLayer({
      layer: makeFillLayerFixture(),
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(withBind.layers[1]).toEqual(withoutBind.layers[1]);
  });

  it("draws the casing on a layer with no stroke width", () => {
    const layer = _boundLayer();
    const spec = makeLayerSpecFromMapLayer({
      layer: {
        ...layer,
        symbology: {
          ...layer.symbology,
          stroke: { width: 0, color: "transparent" },
        },
      },
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(spec.layers.at(-1)!.paint["line-width"]).toBeGreaterThan(0);
  });
});
