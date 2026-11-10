/**
 * Checks the generated data-agent tool list: the duplicate-name guard and
 * that the committed `pluginAiTools.gen.ts` matches what the emitter writes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertUniquePluginAiToolNames,
  emitPluginAiToolsFile,
} from "@plugin-manifest/node/emitPluginAiTools.ts";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../..",
);
const genPath = resolve(
  repoRoot,
  "shared/agent/dataAgent/pluginAiTools.gen.ts",
);

describe("assertUniquePluginAiToolNames", () => {
  it("names both plugins in a duplicate-name error", () => {
    expect(() => {
      assertUniquePluginAiToolNames([
        { pluginId: "avandar.epidemiology", name: "fitRegression" },
        { pluginId: "avandar.other", name: "fitRegression" },
      ]);
    }).toThrow(
      'duplicate ai tool name "fitRegression" on avandar.epidemiology and avandar.other',
    );
  });
});

describe("emitPluginAiToolsFile", () => {
  it("writes an empty list while no bundled plugin declares a tool", () => {
    const text = emitPluginAiToolsFile(repoRoot);
    expect(text).toContain("export const PLUGIN_AI_TOOLS");
    expect(text).toContain("readonly PluginAiToolDeclaration[]");
    expect(readFileSync(genPath, "utf8")).toBe(text);
  });
});
