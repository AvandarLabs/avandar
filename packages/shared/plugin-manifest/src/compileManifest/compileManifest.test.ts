import { compileManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { describe, expect, it } from "vitest";
import type { PluginLocaleMessages } from "@plugin-manifest/strings/resolveManifestString.ts";

const VALID_YAML = `
id: avandar.epidemiology
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: chart-dots
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
`;

const LOCALES = {
  en: {
    "plugin.name": "Epidemiology",
    "plugin.description": "Statistical tools.",
    "regression.linear.title": "Linear regression",
    "regression.unused": "Not referenced by the manifest",
  },
  es: { "plugin.name": "Epidemiología" },
};

function _compile(yamlText: string, locales: PluginLocaleMessages = LOCALES) {
  return compileManifest({
    yamlText,
    sourcePath: "plugins/epi/ava.yaml",
    locales,
  });
}

describe("compileManifest", () => {
  it("returns the manifest and only the strings it references", () => {
    const { manifest, strings } = _compile(VALID_YAML);
    expect(manifest.id).toBe("avandar.epidemiology");
    expect(strings.en).toEqual({
      "plugin.name": "Epidemiology",
      "plugin.description": "Statistical tools.",
      "regression.linear.title": "Linear regression",
    });
    expect(strings.es).toEqual({ "plugin.name": "Epidemiología" });
  });

  it("rejects an unquoted version that YAML parses as a number", () => {
    expect(() => {
      return _compile(VALID_YAML.replace('version: "0.1.0"', "version: 1.10"));
    }).toThrow(/quoted semver/);
  });

  it("keeps a NO country code as a string under YAML 1.2", () => {
    const yamlText = VALID_YAML.replace("license: MIT", "license: NO");
    expect(_compile(yamlText).manifest.license).toBe("NO");
  });

  it("rejects YAML aliases before schema validation", () => {
    // The alias sits in an otherwise valid manifest, so only the alias guard
    // can make this throw. The message names aliasing, not a schema issue.
    const yamlText = VALID_YAML.replace(
      'engines:\n  avandar: "^1"',
      'engines:\n  avandar: &range "^1"',
    ).replace("license: MIT", "license: *range");
    expect(() => {
      return _compile(yamlText);
    }).toThrow(/alias/i);
  });

  it("reports a missing English string", () => {
    expect(() => {
      return _compile(VALID_YAML, { en: { "plugin.name": "Epidemiology" } });
    }).toThrow(
      /"plugin.description" is referenced but missing from locales\/en.json/,
    );
  });

  it("requires locales/en.json", () => {
    expect(() => {
      return _compile(VALID_YAML, { es: LOCALES.es } as never);
    }).toThrow(/locales\/en.json is required/);
  });

  it("lists every schema issue with its path", () => {
    try {
      _compile(VALID_YAML.replace("id: avandar.epidemiology", "id: Bad"));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginManifestError);
      expect((error as PluginManifestError).issues[0]).toMatch(/^id: /);
    }
  });
});
