import {
  definePlugin,
  isPluginDefinition,
} from "@plugin-sdk/definePlugin/definePlugin";
import { describe, expect, it } from "vitest";
import type { PluginVizTransformResult } from "@plugin-sdk/PluginViz.types";

function _makeEmptyBarChart(): PluginVizTransformResult {
  return { rows: [], chart: { kind: "bar", xColumn: "bucket", series: [] } };
}

describe("definePlugin", () => {
  it("marks the definition so the host can recognize it", () => {
    const definition = definePlugin({ commands: { hello: () => {} } });
    expect(isPluginDefinition(definition)).toBe(true);
  });

  it("keeps the chart types it was given", () => {
    const vizTypes = { epicurve: { transform: _makeEmptyBarChart } };
    expect(definePlugin({ vizTypes }).vizTypes).toBe(vizTypes);
  });

  it("defaults the chart types to none when a plugin declares only commands", () => {
    expect(definePlugin({ commands: {} }).vizTypes).toEqual({});
  });

  it("defaults the commands to none when a plugin declares only chart types", () => {
    const definition = definePlugin({
      vizTypes: { epicurve: { transform: _makeEmptyBarChart } },
    });
    expect(definition.commands).toEqual({});
  });

  it("recognizes a definition that declares only chart types", () => {
    const definition = definePlugin({
      vizTypes: { epicurve: { transform: _makeEmptyBarChart } },
    });
    expect(isPluginDefinition(definition)).toBe(true);
  });

  it("rejects values that are not plugin definitions", () => {
    expect(isPluginDefinition({ commands: {} })).toBe(false);
    expect(isPluginDefinition(undefined)).toBe(false);
  });

  it("rejects a definition whose commands are missing", () => {
    expect(isPluginDefinition({ kind: "avandar-plugin", vizTypes: {} })).toBe(
      false,
    );
    expect(
      isPluginDefinition({
        kind: "avandar-plugin",
        commands: null,
        vizTypes: {},
      }),
    ).toBe(false);
  });

  it("accepts a definition that omits aiTools", () => {
    expect(
      isPluginDefinition(definePlugin({ commands: {}, vizTypes: {} })),
    ).toBe(true);
  });

  it("keeps the AI tool handler it was given", () => {
    const definition = definePlugin({
      aiTools: {
        fitRegression: async () => {
          return { slope: 1 };
        },
      },
    });
    expect(typeof definition.aiTools.fitRegression).toBe("function");
  });

  it("rejects a definition whose aiTools is not an object", () => {
    expect(
      isPluginDefinition({
        kind: "avandar-plugin",
        commands: {},
        vizTypes: {},
        aiTools: null,
      }),
    ).toBe(false);
  });

  it("rejects a definition whose chart types are missing", () => {
    expect(isPluginDefinition({ kind: "avandar-plugin", commands: {} })).toBe(
      false,
    );
    expect(
      isPluginDefinition({
        kind: "avandar-plugin",
        commands: {},
        vizTypes: null,
      }),
    ).toBe(false);
  });
});
