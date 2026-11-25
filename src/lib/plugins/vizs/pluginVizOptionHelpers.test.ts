import { describe, expect, it } from "vitest";
import {
  getPluginVizSelectionFromOptionValue,
  makePluginVizMemoryKey,
  makePluginVizOptionValue,
} from "@/lib/plugins/vizs/pluginVizOptionHelpers";

const EPICURVE = { pluginId: "avandar.epidemiology", pluginVizId: "epicurve" };

describe("makePluginVizOptionValue", () => {
  it("encodes a plugin chart type as plugin:<pluginId>/<pluginVizId>", () => {
    expect(makePluginVizOptionValue(EPICURVE)).toBe(
      "plugin:avandar.epidemiology/epicurve",
    );
  });
});

describe("getPluginVizSelectionFromOptionValue", () => {
  it("decodes the plugin chart type an option value names", () => {
    expect(
      getPluginVizSelectionFromOptionValue(
        "plugin:avandar.epidemiology/epicurve",
      ),
    ).toEqual(EPICURVE);
  });

  it("decodes a chart type id that contains dots", () => {
    expect(
      getPluginVizSelectionFromOptionValue("plugin:avandar.epi/rate.plot"),
    ).toEqual({ pluginId: "avandar.epi", pluginVizId: "rate.plot" });
  });

  it("returns undefined for a built-in viz type value", () => {
    expect(getPluginVizSelectionFromOptionValue("bar")).toBeUndefined();
  });

  it("returns undefined for a plugin value with no chart type id", () => {
    expect(
      getPluginVizSelectionFromOptionValue("plugin:avandar.epidemiology/"),
    ).toBeUndefined();
  });

  it("returns undefined for a plugin value with no slash", () => {
    expect(
      getPluginVizSelectionFromOptionValue("plugin:avandar.epidemiology"),
    ).toBeUndefined();
  });

  it("returns undefined for a plugin value with an extra path segment", () => {
    expect(
      getPluginVizSelectionFromOptionValue(
        "plugin:avandar.epidemiology/epicurve/extra",
      ),
    ).toBeUndefined();
  });
});

describe("makePluginVizMemoryKey", () => {
  it("keys a plugin chart type as <pluginId>/<pluginVizId>", () => {
    expect(makePluginVizMemoryKey(EPICURVE)).toBe(
      "avandar.epidemiology/epicurve",
    );
  });
});
