import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import {
  createVersion4JsonWithLayer,
  createVersion5BlankDisclaimerJson,
  createVersion5OverlappingDisputedJson,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { describe, expect, it } from "vitest";

describe("AvaMapConfigSchema v5 export layout", () => {
  it("migrates a version 4 config into the default export layout", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion4JsonWithLayer());

    expect(parsed.version).toBe(5);
    expect(parsed.exportLayout).toEqual({
      paper: "a4",
      orientation: "landscape",
      title: { isVisible: true, text: "" },
      subtitle: { isVisible: true, text: "" },
      northArrow: true,
      scaleBar: true,
      sourceLine: "",
      disclaimer: undefined,
    });
  });

  it("migrates every version 4 layer to an unbound disputed status", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion4JsonWithLayer());

    expect(parsed.layers[0]?.disputedStatusColumn).toBeUndefined();
    expect(parsed.layers[0]?.disputedStatusValues).toEqual({
      disputed: [],
      undetermined: [],
    });
  });

  it("keeps version 4 overlay behavior through the migration", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion4JsonWithLayer());

    expect(parsed.aoi).toBeUndefined();
    expect(parsed.timeRange).toBeUndefined();
    expect(parsed.layers[0]?.applyAoiFilter).toBe(true);
    expect(parsed.layers[0]?.timeColumn).toBeUndefined();
  });

  it("rejects a blank disclaimer at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(createVersion5BlankDisclaimerJson());
    }).toThrow();
  });

  it("rejects a value listed as both disputed and undetermined", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(
        createVersion5OverlappingDisputedJson(),
      );
    }).toThrow();
  });

  it("round-trips an edited export layout and a disputed bind", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        paper: "letter",
        orientation: "portrait",
        title: { isVisible: true, text: "Cholera response" },
        subtitle: { isVisible: false, text: "" },
        northArrow: false,
        scaleBar: true,
        sourceLine: "OCHA",
        disclaimer: "Our own required wording.",
      },
    });

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });
});
