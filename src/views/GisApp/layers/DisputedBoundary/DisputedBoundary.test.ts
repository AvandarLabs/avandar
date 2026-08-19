import { describe, expect, it } from "vitest";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";

const VALUES = {
  disputed: ["Disputed"],
  undetermined: ["Undetermined", "Unknown"],
};

describe("DisputedBoundary.getStatusFromValue", () => {
  it("reads a disputed value", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: "Disputed", values: VALUES }),
    ).toBe("disputed");
  });

  it("reads an undetermined value", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: "Unknown", values: VALUES }),
    ).toBe("undetermined");
  });

  it("treats an unlisted value as settled", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: "Agreed", values: VALUES }),
    ).toBe("settled");
  });

  it("treats null as settled", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: null, values: VALUES }),
    ).toBe("settled");
  });

  it("treats a missing property as settled", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: undefined, values: VALUES }),
    ).toBe("settled");
  });

  it("treats a non-string value as settled", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: 42, values: VALUES }),
    ).toBe("settled");
  });

  it("uses the reserved spatial property name", () => {
    expect(DisputedBoundary.propertyName).toBe(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
  });
});

describe("DisputedBoundary.hasDrawnDisputedFeature", () => {
  it("is false when the layer has no bind", () => {
    expect(
      DisputedBoundary.hasDrawnDisputedFeature({
        values: { disputed: [], undetermined: [] },
        featureCollection: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [] },
              properties: { [DisputedBoundary.propertyName]: "Disputed" },
            },
          ],
        },
      }),
    ).toBe(false);
  });

  it("is true when at least one drawn feature is disputed", () => {
    expect(
      DisputedBoundary.hasDrawnDisputedFeature({
        values: VALUES,
        featureCollection: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [] },
              properties: { [DisputedBoundary.propertyName]: "Agreed" },
            },
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [] },
              properties: { [DisputedBoundary.propertyName]: "Undetermined" },
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it("is false when every drawn feature is settled", () => {
    expect(
      DisputedBoundary.hasDrawnDisputedFeature({
        values: VALUES,
        featureCollection: { type: "FeatureCollection", features: [] },
      }),
    ).toBe(false);
  });
});
