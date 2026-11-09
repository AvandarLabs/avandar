import {
  definePlugin,
  isPluginDefinition,
} from "@plugin-sdk/definePlugin/definePlugin";
import { describe, expect, it } from "vitest";

describe("definePlugin", () => {
  it("marks the definition so the host can recognize it", () => {
    const definition = definePlugin({ commands: { hello: () => {} } });
    expect(isPluginDefinition(definition)).toBe(true);
  });

  it("rejects values that are not plugin definitions", () => {
    expect(isPluginDefinition({ commands: {} })).toBe(false);
    expect(isPluginDefinition(undefined)).toBe(false);
  });

  it("rejects a definition whose commands are missing", () => {
    expect(isPluginDefinition({ kind: "avandar-plugin" })).toBe(false);
    expect(isPluginDefinition({ kind: "avandar-plugin", commands: null })).toBe(
      false,
    );
  });
});
