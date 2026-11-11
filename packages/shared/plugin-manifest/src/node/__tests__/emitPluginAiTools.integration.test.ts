/**
 * Checks the generated data-agent tool list: the duplicate-name guard and
 * that the committed `pluginAiTools.gen.ts` matches what the emitter writes.
 */
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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

  it("does not write the file when another vite-node script imports it", () => {
    const scriptDirectory = mkdtempSync(join(tmpdir(), "emit-ai-tools-"));
    const importerPath = join(scriptDirectory, "importer.ts");
    writeFileSync(
      importerPath,
      `import "${resolve(repoRoot, "packages/shared/plugin-manifest/src/node/emitPluginAiTools.ts")}";\n`,
    );
    const modifiedTimeBefore = statSync(genPath).mtimeMs;
    try {
      execFileSync("pnpm", ["vite-script", importerPath], {
        cwd: repoRoot,
        stdio: "pipe",
      });
      expect(statSync(genPath).mtimeMs).toBe(modifiedTimeBefore);
    } finally {
      rmSync(scriptDirectory, { recursive: true, force: true });
    }
  });
});
