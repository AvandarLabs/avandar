import { describe, expect, it } from "vitest";
import {
  checkPluginBundle,
  HOST_BUDGET_BYTES,
  makeChunkSummariesFromBundle,
  PER_PLUGIN_BUDGET_BYTES,
} from "./checkPluginBundle";
import type { ChunkSummary } from "./checkPluginBundle";
import type { Rollup } from "vite";

const PLUGINS_DIRECTORY = "/repo/plugins";

function _chunk(
  overrides: Partial<ChunkSummary> & { fileName: string },
): ChunkSummary {
  return { isEntry: false, imports: [], moduleLengths: {}, ...overrides };
}

describe("checkPluginBundle", () => {
  it("passes when plugin code is only in lazy chunks", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 1,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: {
            "\0virtual:ava-plugin-index": 300,
            "/repo/src/lib/plugins/PluginHost/PluginHost.tsx": 4_000,
          },
        }),
        _chunk({
          fileName: "epi.js",
          moduleLengths: {
            "/repo/plugins/epidemiology/src/index.tsx": 9_000,
          },
        }),
      ],
    });
    expect(violations).toEqual([]);
  });

  it("fails when a plugin module is statically reachable from the entry", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 1,
      chunks: [
        _chunk({ fileName: "index.js", isEntry: true, imports: ["shared.js"] }),
        _chunk({
          fileName: "shared.js",
          moduleLengths: {
            "/repo/plugins/epidemiology/src/index.tsx": 9_000,
          },
        }),
      ],
    });
    expect(violations[0]).toContain("plugins/epidemiology/src/index.tsx");
  });

  it("fails when a plugin manifest module is statically reachable", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 1,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: {
            "\0virtual:ava-plugin-manifest/avandar.epidemiology": 900,
          },
        }),
      ],
    });
    expect(violations).toHaveLength(1);
  });

  it("fails when a plugin locales module is statically reachable", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 1,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: {
            "\0virtual:ava-plugin-locales/avandar.epidemiology": 900,
          },
        }),
      ],
    });
    expect(violations).toHaveLength(1);
  });

  it("fails when the plugin host exceeds its budget", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 0,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: {
            "/repo/src/lib/plugins/PluginHost/PluginHost.tsx":
              HOST_BUDGET_BYTES + 1,
          },
        }),
      ],
    });
    expect(violations[0]).toMatch(/plugin host adds .* bytes/);
  });

  it("counts the plugin SDK in an entry chunk toward the host budget", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 0,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: {
            "/repo/packages/web/plugin-sdk/createAvandarApi.ts":
              HOST_BUDGET_BYTES + 1,
          },
        }),
      ],
    });
    expect(violations[0]).toMatch(/plugin host adds .* bytes/);
  });

  it("raises the host budget for each bundled plugin", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 2,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: {
            "/repo/src/lib/plugins/PluginHost/PluginHost.tsx":
              HOST_BUDGET_BYTES + 2 * PER_PLUGIN_BUDGET_BYTES,
          },
        }),
      ],
    });
    expect(violations).toEqual([]);
  });
});

describe("makeChunkSummariesFromBundle", () => {
  it("keeps chunks with their rendered module lengths and skips assets", () => {
    const bundle = {
      "index.js": {
        type: "chunk",
        fileName: "index.js",
        isEntry: true,
        imports: ["shared.js"],
        modules: { "/repo/src/main.tsx": { renderedLength: 120 } },
      },
      "logo.svg": { type: "asset", fileName: "logo.svg" },
    } as unknown as Rollup.OutputBundle;

    expect(makeChunkSummariesFromBundle(bundle)).toEqual([
      {
        fileName: "index.js",
        isEntry: true,
        imports: ["shared.js"],
        moduleLengths: { "/repo/src/main.tsx": 120 },
      },
    ]);
  });
});
