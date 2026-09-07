import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayerSpatialQueryColumns } from "../MapLayerSpatialQuery.constants";
import { parseMapLayerSpatialResult } from "./parseMapLayerSpatialResult";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";

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
      parseMapLayerSpatialResult({
        queryResult: _createResult(
          JSON.stringify(featureCollection),
          diagnostics,
        ),
        family: "polygon",
      }),
    ).toEqual({ featureCollection, diagnostics });
  });

  it("accepts an empty FeatureCollection", () => {
    const featureCollection = { type: "FeatureCollection", features: [] };
    expect(
      parseMapLayerSpatialResult({
        queryResult: _createResult(
          featureCollection,
          JSON.stringify(diagnostics),
        ),
        family: "polygon",
      }).featureCollection,
    ).toEqual(featureCollection);
  });

  it("preserves bin diagnostics from the spatial result envelope", () => {
    const featureCollection = { type: "FeatureCollection", features: [] };
    const binDiagnostics = {
      ...diagnostics,
      nonPointCount: 2,
      suppressedCount: 3,
      isEmptyAfterDrops: true,
    };

    expect(
      parseMapLayerSpatialResult({
        queryResult: _createResult(
          featureCollection,
          JSON.stringify(binDiagnostics),
        ),
        family: "polygon",
      }).diagnostics,
    ).toEqual(binDiagnostics);
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
      parseMapLayerSpatialResult({
        queryResult: _createResult(featureCollection, resultDiagnostics),
        family: "polygon",
      });
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
      parseMapLayerSpatialResult({
        queryResult: _createResult(featureCollection, diagnostics),
        family: "polygon",
      });
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
      parseMapLayerSpatialResult({
        queryResult: _createResult(featureCollection, {
          ...diagnostics,
          observedFamilies: ["point"],
        }),
        family: "point",
      }).featureCollection.features,
    ).toHaveLength(2);
  });

  it("rejects mixed geometry families", () => {
    const featureCollection = { type: "FeatureCollection", features: [] };
    expect(() => {
      parseMapLayerSpatialResult({
        queryResult: _createResult(featureCollection, {
          ...diagnostics,
          observedFamilies: ["point", "polygon"],
          hasMixedFamilies: true,
        }),
        family: "polygon",
      });
    }).toThrow(/mixed/i);
  });
});
