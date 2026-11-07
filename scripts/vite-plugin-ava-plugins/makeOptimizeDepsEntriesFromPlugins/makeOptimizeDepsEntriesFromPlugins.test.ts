import { describe, expect, it } from "vitest";
import { makeOptimizeDepsEntriesFromPlugins } from "./makeOptimizeDepsEntriesFromPlugins";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";

// A partial fixture: it carries only the field the entries read, so the cast
// skips filling in the rest of the directory shape.
function _makePluginWithEntryPath(entryPath: string): PluginDirectory {
  return { entryPath } as unknown as PluginDirectory;
}

describe("makeOptimizeDepsEntriesFromPlugins", () => {
  it("keeps Vite's default HTML entries so the app is still scanned", () => {
    expect(
      makeOptimizeDepsEntriesFromPlugins({ plugins: [], repoRoot: "/repo" }),
    ).toEqual(["**/*.html"]);
  });

  it("adds each plugin's entry file as a root-relative path", () => {
    const entries = makeOptimizeDepsEntriesFromPlugins({
      plugins: [
        _makePluginWithEntryPath("/repo/plugins/epidemiology/src/index.tsx"),
        _makePluginWithEntryPath("/repo/plugins/hello/main.ts"),
      ],
      repoRoot: "/repo",
    });

    expect(entries).toEqual([
      "**/*.html",
      "plugins/epidemiology/src/index.tsx",
      "plugins/hello/main.ts",
    ]);
  });
});
