import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { describe, expect, it } from "vitest";

describe("PluginManifestError", () => {
  it("lists each issue under its own bullet", () => {
    const error = new PluginManifestError({
      sourcePath: "plugins/epi/ava.yaml",
      issues: ["first", "second"],
    });
    expect(error.message).toBe(
      "Invalid plugin manifest plugins/epi/ava.yaml:\n  - first\n  - second",
    );
  });

  it("indents continuation lines so they stay under their bullet", () => {
    const error = new PluginManifestError({
      sourcePath: "ava.yaml",
      issues: [
        "Unresolved tag: !foo\n\nlicense: !foo MIT\n         ^^^^\n",
        "next",
      ],
    });
    expect(error.message).toBe(
      [
        "Invalid plugin manifest ava.yaml:",
        "  - Unresolved tag: !foo",
        "",
        "    license: !foo MIT",
        "             ^^^^",
        "  - next",
      ].join("\n"),
    );
  });

  it("keeps the raw issues unindented", () => {
    const error = new PluginManifestError({
      sourcePath: "ava.yaml",
      issues: ["a\nb"],
    });
    expect(error.issues).toEqual(["a\nb"]);
  });
});
