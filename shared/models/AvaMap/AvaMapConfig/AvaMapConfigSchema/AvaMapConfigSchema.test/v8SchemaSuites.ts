import { describe, expect, it } from "vitest";
import {
  createEmptyVersion7Json,
  createVersion8FeatureListJson,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

describe("AvaMapConfigSchema v8 feature list", () => {
  it("migrates a version 7 config to version 8 with no feature list", () => {
    const parsed = AvaMapConfigSchema.fromJson(createEmptyVersion7Json());

    expect(parsed.version).toBe(8);
    expect(parsed.exportLayout.featureList).toBeUndefined();
  });

  it("keeps every version 7 field when migrating to version 8", () => {
    const source = MapLayer.createArea("Sites");
    const filtered = {
      ...MapLayer.makeEmpty("Cases"),
      spatialFilter: { layerId: source.id },
    };
    const json = createEmptyVersion7Json();
    const version7Json = {
      ...json,
      layers: [source, filtered],
      exportLayout: {
        ...json.exportLayout,
        paper: "letter",
        title: { isVisible: true, text: "Measles exposure" },
        disclaimer: "Provisional",
      },
    } as const;

    expect(AvaMapConfigSchema.fromJson(version7Json)).toEqual({
      ...version7Json,
      version: 8,
      exportLayout: { ...version7Json.exportLayout, featureList: undefined },
    });
  });

  it("round-trips a feature list with a sort", () => {
    const config = AvaMapConfigSchema.fromJson(createVersion8FeatureListJson());

    expect(config.exportLayout.featureList?.sort?.direction).toBe("desc");
    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("round-trips a feature list in its default order", () => {
    const config = AvaMapConfigSchema.fromJson(
      createVersion8FeatureListJson({ hasSort: false }),
    );

    expect(config.exportLayout.featureList?.sort).toBeUndefined();
    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("rejects a row cap above 1,000 at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(
        createVersion8FeatureListJson({ maxRows: 1001 }),
      );
    }).toThrow();
  });

  it("rejects a row cap of zero at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(
        createVersion8FeatureListJson({ maxRows: 0 }),
      );
    }).toThrow();
  });
});
