import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { parseStrictYaml } from "@plugin-manifest/yaml/parseStrictYaml/parseStrictYaml.ts";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "plugins/bundled.yaml";

function _parse(yamlText: string): unknown {
  return parseStrictYaml({ yamlText, sourcePath: SOURCE_PATH });
}

function _getError(yamlText: string): PluginManifestError {
  try {
    _parse(yamlText);
  } catch (error) {
    expect(error).toBeInstanceOf(PluginManifestError);
    return error as PluginManifestError;
  }
  return expect.unreachable();
}

describe("parseStrictYaml", () => {
  it("returns the plain value of a valid document", () => {
    expect(_parse("plugins:\n  - hello\n")).toEqual({ plugins: ["hello"] });
  });

  it.each([
    ["an empty file", ""],
    ["only a comment", "# nothing here\n"],
  ])("returns null for %s", (_label, yamlText) => {
    expect(_parse(yamlText)).toBeNull();
  });

  it("keeps a NO country code as a string under YAML 1.2", () => {
    expect(_parse("country: NO\n")).toEqual({ country: "NO" });
  });

  it("rejects a duplicate key and names the source path", () => {
    const error = _getError("plugins: []\nplugins: []\n");
    expect(error.sourcePath).toBe(SOURCE_PATH);
    expect(error.issues.join("\n")).toMatch(/unique/i);
  });

  it("rejects a YAML alias", () => {
    expect(_getError("a: &x 1\nb: *x\n").issues.join("\n")).toMatch(/alias/i);
  });

  it("treats a YAML warning as an error", () => {
    const error = _getError("plugins: !foo []\n");
    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]).toMatch(/Unresolved tag/);
  });
});
