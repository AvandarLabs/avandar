import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import {
  createGraduatedAreaLayer,
  createVersion5JsonWithGraduatedLayer,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";

describe("AvaMapConfigSchema v6 class colors", () => {
  it("resamples a version 5 ramp to the lightest and darkest colors for two classes", () => {
    const parsed = AvaMapConfigSchema.fromJson(
      createVersion5JsonWithGraduatedLayer(),
    );

    expect(parsed.version).toBe(7);
    expect(parsed.layers[0]?.symbology).toMatchObject({
      color: { ramp: ["#eff3ff", "#08306b"] },
    });
  });

  it("gives every migrated class an unset label", () => {
    const parsed = AvaMapConfigSchema.fromJson(
      createVersion5JsonWithGraduatedLayer(),
    );

    expect(parsed.layers[0]?.symbology).toMatchObject({
      color: { classLabels: [undefined, undefined] },
    });
  });

  it("recolors the persisted legend keys of a migrated graduated layer", () => {
    const parsed = AvaMapConfigSchema.fromJson(
      createVersion5JsonWithGraduatedLayer(),
    );

    const legendColors = parsed.layers[0]?.legend.entries.map((entry) => {
      return entry.color;
    });
    expect(legendColors).toEqual(["#eff3ff", "#08306b", "#ced4da"]);
  });

  it("round-trips class labels, keeping an unset label unset", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: createGraduatedAreaLayer(),
    });

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("writes an unset class label as null in JSON", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: createGraduatedAreaLayer(),
    });
    const json = AvaMapConfigSchema.toJson(config) as {
      layers: Array<{ symbology: { color: { classLabels: unknown[] } } }>;
    };

    expect(json.layers[0]!.symbology.color.classLabels).toEqual([
      "Below 95%",
      null,
    ]);
  });
});
