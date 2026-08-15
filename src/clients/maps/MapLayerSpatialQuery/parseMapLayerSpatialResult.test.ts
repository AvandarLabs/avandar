import { uuid } from "$/lib/uuid";
import { describe, expect, it } from "vitest";
import { MapLayerSpatialQueryColumns } from "./MapLayerSpatialQuery.constants";
import { parseMapLayerSpatialResult } from "./parseMapLayerSpatialResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

function _createResult(
  featureCollection: unknown,
  diagnostics: unknown,
): QueryResult.T<UnknownRow> {
  return {
    id: uuid<QueryResult.Id>(),
    columns: [],
    numRows: 1,
    data: [
      {
        [MapLayerSpatialQueryColumns.featureCollection]: featureCollection,
        [MapLayerSpatialQueryColumns.diagnostics]: diagnostics,
      },
    ],
  };
}

const diagnostics = {
  sourceCount: 2,
  parsedCount: 2,
  invalidCount: 0,
  observedFamilies: ["polygon"],
  hasMixedFamilies: false,
};

describe("parseMapLayerSpatialResult", () => {
  it("parses a valid FeatureCollection and its diagnostics", () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [0, 0],
                  [1, 0],
                  [0, 0],
                ],
              ],
            ],
          },
          properties: { label: "North" },
        },
      ],
    };

    expect(
      parseMapLayerSpatialResult(
        _createResult(JSON.stringify(featureCollection), diagnostics),
        "polygon",
      ),
    ).toEqual({ featureCollection, diagnostics });
  });

  it("accepts an empty FeatureCollection", () => {
    const featureCollection = { type: "FeatureCollection", features: [] };
    expect(
      parseMapLayerSpatialResult(
        _createResult(featureCollection, JSON.stringify(diagnostics)),
        "polygon",
      ).featureCollection,
    ).toEqual(featureCollection);
  });

  it.each([
    ["malformed JSON", "{", diagnostics],
    ["a missing envelope row", undefined, undefined],
    [
      "the wrong envelope shape",
      { type: "Feature", geometry: null },
      diagnostics,
    ],
  ])("rejects %s", (_label, featureCollection, resultDiagnostics) => {
    expect(() => {
      parseMapLayerSpatialResult(
        _createResult(featureCollection, resultDiagnostics),
        "polygon",
      );
    }).toThrow();
  });

  it("rejects a feature outside the configured family", () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {},
        },
      ],
    };
    expect(() => {
      parseMapLayerSpatialResult(
        _createResult(featureCollection, diagnostics),
        "polygon",
      );
    }).toThrow(/family/i);
  });

  it("accepts single and multi variants from the same family", () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {},
        },
        {
          type: "Feature",
          geometry: { type: "MultiPoint", coordinates: [[1, 1]] },
          properties: {},
        },
      ],
    };
    expect(
      parseMapLayerSpatialResult(
        _createResult(featureCollection, {
          ...diagnostics,
          observedFamilies: ["point"],
        }),
        "point",
      ).featureCollection.features,
    ).toHaveLength(2);
  });

  it("rejects mixed geometry families", () => {
    const featureCollection = { type: "FeatureCollection", features: [] };
    expect(() => {
      parseMapLayerSpatialResult(
        _createResult(featureCollection, {
          ...diagnostics,
          observedFamilies: ["point", "polygon"],
          hasMixedFamilies: true,
        }),
        "polygon",
      );
    }).toThrow(/mixed/i);
  });
});
