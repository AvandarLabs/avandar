import { describe, expect, it } from "vitest";
import {
  AvaPluginVizConfigSchema,
  UiPluginVizConfigSchema,
} from "$/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.ts";

const UI_CONFIG = {
  vizType: "plugin",
  pluginId: "avandar.epidemiology",
  pluginVizId: "epicurve",
  columnSettings: { date: "onset_date", stack: undefined },
  settings: { interval: "epiWeek", maxSeries: 8, showOther: true },
};

describe("UiPluginVizConfigSchema", () => {
  it("accepts string, number, and boolean settings with an unset column", () => {
    expect(UiPluginVizConfigSchema.safeParse(UI_CONFIG).success).toBe(true);
  });

  it("rejects an empty plugin id", () => {
    const result = UiPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      pluginId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty chart type id", () => {
    const result = UiPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      pluginVizId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a setting value that is an object", () => {
    const result = UiPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      settings: { interval: { value: "epiWeek" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a column setting that is a number", () => {
    const result = UiPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      columnSettings: { date: 3 },
    });
    expect(result.success).toBe(false);
  });
});

describe("AvaPluginVizConfigSchema", () => {
  it("accepts a config whose column settings hold column IDs", () => {
    const result = AvaPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      columnSettings: { date: "0b6f3a52-9a3e-4f43-a2a4-1c1fbd0f6d1e" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a built-in chart config", () => {
    const result = AvaPluginVizConfigSchema.safeParse({ vizType: "table" });
    expect(result.success).toBe(false);
  });
});
