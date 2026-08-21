import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { createBoundLayer } from "./MapLayerUpdates.fixtures";

/** A polygon layer eligible for a disputed-status bind. */
function _eligibleLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Admin 1"),
    geoBinding: {
      type: "geometryColumn",
      column: MapLayer.makeEmpty("x").id as never,
      encoding: "wkt",
      family: "polygon",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
}

describe("disputed-status updates", () => {
  describe("withDisputedStatusColumn", () => {
    it("binds a column on an eligible layer and resets values", () => {
      const layer = {
        ..._eligibleLayer(),
        disputedStatusValues: { disputed: ["x"], undetermined: ["y"] },
      };
      const reference: MapLayer.DisputedStatusRef = {
        type: "queryColumn",
        column: layer.geoBinding as never,
      };

      const updated = MapLayerUpdates.withDisputedStatusColumn({
        layer,
        reference,
      });

      expect(updated.disputedStatusColumn).toEqual(reference);
      expect(updated.disputedStatusValues).toEqual(
        MapLayer.emptyDisputedStatusValues,
      );
    });

    it("rejects binding on an ineligible layer, unchanged by reference", () => {
      // createBoundLayer: circle symbology, latLngColumns binding
      const layer = createBoundLayer();
      const reference: MapLayer.DisputedStatusRef = {
        type: "queryColumn",
        column: layer.id as never,
      };

      const updated = MapLayerUpdates.withDisputedStatusColumn({
        layer,
        reference,
      });

      expect(updated).toBe(layer);
    });

    it("clears both the column and the values when given undefined", () => {
      const layer = {
        ..._eligibleLayer(),
        disputedStatusColumn: {
          type: "queryColumn" as const,
          column: "col" as never,
        },
        disputedStatusValues: { disputed: ["x"], undetermined: [] },
      };

      const updated = MapLayerUpdates.withDisputedStatusColumn({
        layer,
        reference: undefined,
      });

      expect(updated.disputedStatusColumn).toBeUndefined();
      expect(updated.disputedStatusValues).toEqual(
        MapLayer.emptyDisputedStatusValues,
      );
    });

    it("is a no-op by reference when already unbound and given undefined", () => {
      const layer = _eligibleLayer();

      const updated = MapLayerUpdates.withDisputedStatusColumn({
        layer,
        reference: undefined,
      });

      expect(updated).toBe(layer);
    });
  });

  describe("withDisputedStatusValues", () => {
    function _boundLayer(): MapLayer.T {
      return {
        ..._eligibleLayer(),
        disputedStatusColumn: {
          type: "queryColumn",
          column: "col" as never,
        },
      };
    }

    it("assigns disjoint values to the disputed and undetermined lists", () => {
      const layer = _boundLayer();
      const values = { disputed: ["Disputed"], undetermined: ["Undetermined"] };

      const updated = MapLayerUpdates.withDisputedStatusValues({
        layer,
        values,
      });

      expect(updated.disputedStatusValues).toEqual(values);
    });

    it("rejects assignment when no column is bound, unchanged by reference", () => {
      const layer = _eligibleLayer();
      const values = { disputed: ["Disputed"], undetermined: [] };

      const updated = MapLayerUpdates.withDisputedStatusValues({
        layer,
        values,
      });

      expect(updated).toBe(layer);
    });

    it("rejects an overlapping assignment, unchanged by reference", () => {
      const layer = _boundLayer();
      const values = { disputed: ["Disputed"], undetermined: ["Disputed"] };

      const updated = MapLayerUpdates.withDisputedStatusValues({
        layer,
        values,
      });

      expect(updated).toBe(layer);
    });
  });
});
