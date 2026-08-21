import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import {
  createMismatchedBufferJson,
  createMissingBufferSourceJson,
  createValidBufferJson,
  createVersion3Json,
  createVersion4CyclicBufferJson,
  createVersion4ReversedTimeJson,
  createVersion4TwoLayerBufferCycleJson,
  textAnnotation,
  unitSquare,
  waveCLayer,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { describe, expect, it } from "vitest";

describe("AvaMapConfigSchema v4 overlays", () => {
  it("migrates a version 3 config to version 4 without changing wave c layers", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion3Json());
    expect(parsed.version).toBe(5);
    expect(parsed.aoi).toBeUndefined();
    expect(parsed.timeRange).toBeUndefined();
    expect(parsed.annotations.features).toEqual([]);
    expect(parsed.annotationsZIndex).toBe(parsed.layers.length);
    expect(parsed.layers[0]?.applyAoiFilter).toBe(true);
    expect(parsed.layers[0]?.timeColumn).toBeUndefined();
    expect(parsed.layers[0]?.symbology).toEqual(waveCLayer.symbology);
  });

  it("rejects a reversed time range at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(createVersion4ReversedTimeJson());
    }).toThrow();
  });

  it("rejects a buffer cycle at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(createVersion4CyclicBufferJson());
    }).toThrow("Buffer layer chain contains a cycle");
  });

  it("rejects a two-layer buffer cycle at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(
        createVersion4TwoLayerBufferCycleJson(),
      );
    }).toThrow("Buffer layer chain contains a cycle");
  });

  it("keeps a buffer whose source layer is missing", () => {
    const json = createMissingBufferSourceJson();
    const missingSourceId = json.layers[0]!.geoBinding.layerId;
    const parsed = AvaMapConfigSchema.fromJson(json);
    const buffer = parsed.layers.find((layer) => {
      return layer.geoBinding?.type === "bufferOfLayer";
    });

    expect(buffer?.geoBinding).toEqual({
      type: "bufferOfLayer",
      layerId: missingSourceId,
      distanceMeters: 1000,
      dissolve: false,
    });
  });

  it("round-trips a buffer whose source layer is missing", () => {
    const parsed = AvaMapConfigSchema.fromJson(createMissingBufferSourceJson());

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(parsed)),
    ).toEqual(parsed);
  });

  it("round-trips after the buffer source layer is removed", () => {
    const json = createValidBufferJson();
    const config = AvaMapConfigSchema.fromJson(json);
    const sourceId = json.layers[0]!.id;
    const withoutSource = AvaMapConfig.withLayerRemoved({
      config,
      layerId: sourceId,
    });

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(withoutSource)),
    ).toEqual(withoutSource);
    expect(withoutSource.layers).toHaveLength(1);
    expect(withoutSource.layers[0]?.geoBinding?.type).toBe("bufferOfLayer");
  });

  it("keeps a buffer whose sensitivity does not match the source", () => {
    const parsed = AvaMapConfigSchema.fromJson(createMismatchedBufferJson());
    const buffer = parsed.layers.find((layer) => {
      return layer.geoBinding?.type === "bufferOfLayer";
    });

    expect(buffer?.sensitivity.mode).toBe("aggregateOnly");
  });

  it("accepts a valid bufferOfLayer config at the json boundary", () => {
    const json = createValidBufferJson();
    const sourceId = json.layers[0]!.id;
    const parsed = AvaMapConfigSchema.fromJson(json);
    const buffer = parsed.layers.find((layer) => {
      return layer.geoBinding?.type === "bufferOfLayer";
    });

    expect(buffer?.geoBinding).toEqual({
      type: "bufferOfLayer",
      layerId: sourceId,
      distanceMeters: 1000,
      dissolve: false,
    });
  });

  it("round-trips annotations and an AOI polygon", () => {
    const config = AvaMapConfig.withAoi({
      config: AvaMapConfig.withAnnotationFeature({
        config: AvaMapConfig.makeEmpty(),
        feature: textAnnotation,
      }),
      aoi: unitSquare,
    });
    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });
});
