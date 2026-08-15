import { uuid } from "$/lib/uuid";
import { describe, expect, it } from "vitest";
import { makeStackOrderFromLayerMove } from "@/views/GisApp/panels/LayerPanel/makeStackOrderFromLayerMove/makeStackOrderFromLayerMove";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const firstLayerId = uuid<MapLayer.Id>();
const secondLayerId = uuid<MapLayer.Id>();
const thirdLayerId = uuid<MapLayer.Id>();

describe("makeStackOrderFromLayerMove", () => {
  it("moves a layer one row up", () => {
    expect(
      makeStackOrderFromLayerMove({
        orderedLayerIds: [firstLayerId, secondLayerId, thirdLayerId],
        layerId: thirdLayerId,
        offset: -1,
      }),
    ).toEqual([firstLayerId, thirdLayerId, secondLayerId]);
  });

  it("moves a layer one row down", () => {
    expect(
      makeStackOrderFromLayerMove({
        orderedLayerIds: [firstLayerId, secondLayerId, thirdLayerId],
        layerId: firstLayerId,
        offset: 1,
      }),
    ).toEqual([secondLayerId, firstLayerId, thirdLayerId]);
  });

  it("returns the same order when the layer is already at the top", () => {
    const order = [firstLayerId, secondLayerId, thirdLayerId];
    expect(
      makeStackOrderFromLayerMove({
        orderedLayerIds: order,
        layerId: firstLayerId,
        offset: -1,
      }),
    ).toBe(order);
  });

  it("returns the same order when the layer is already at the bottom", () => {
    const order = [firstLayerId, secondLayerId, thirdLayerId];
    expect(
      makeStackOrderFromLayerMove({
        orderedLayerIds: order,
        layerId: thirdLayerId,
        offset: 1,
      }),
    ).toBe(order);
  });

  it("returns the same order for an unknown layer", () => {
    const order = [firstLayerId, secondLayerId];
    expect(
      makeStackOrderFromLayerMove({
        orderedLayerIds: order,
        layerId: thirdLayerId,
        offset: -1,
      }),
    ).toBe(order);
  });
});
