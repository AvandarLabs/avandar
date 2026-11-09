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
const PLUGIN_CODE_MODULE = "/repo/plugins/epidemiology/src/index.tsx";
const PLUGIN_HOST_MODULE = "/repo/src/lib/plugins/PluginHost/PluginHost.tsx";
const RUNNER_MODULE =
  "/repo/src/lib/plugins/runPluginCommand/runPluginCommand.ts";
const SDK_MODULE = "/repo/packages/web/plugin-sdk/definePlugin.ts";

function _chunk(
  overrides: Partial<ChunkSummary> & { fileName: string },
): ChunkSummary {
  return {
    isEntry: false,
    imports: [],
    dynamicImports: [],
    moduleLengths: {},
    ...overrides,
  };
}

/**
 * The chunk graph of a correct build. The entry lazily loads the workspace
 * layout and the Data Explorer route. The layout statically imports the chunk
 * holding the plugin index and lazily loads the command runner. The index's
 * loaders reach the plugin's manifest, locales, and code, and the code shares
 * an SDK chunk with the runner.
 */
const CORRECT_CHUNKS: readonly ChunkSummary[] = [
  _chunk({
    fileName: "index.js",
    isEntry: true,
    dynamicImports: ["layout.js", "explorer.js"],
  }),
  _chunk({
    fileName: "layout.js",
    imports: ["index.js", "plugin-index.js"],
    dynamicImports: ["runner.js"],
    moduleLengths: { [PLUGIN_HOST_MODULE]: 4_000 },
  }),
  _chunk({
    fileName: "plugin-index.js",
    dynamicImports: ["manifest.js", "code.js", "locales.js"],
    moduleLengths: { "\0virtual:ava-plugin-index": 300 },
  }),
  _chunk({ fileName: "explorer.js", imports: ["index.js"] }),
  _chunk({
    fileName: "manifest.js",
    moduleLengths: { "\0virtual:ava-plugin-manifest/avandar.epi": 900 },
  }),
  _chunk({
    fileName: "locales.js",
    moduleLengths: { "\0virtual:ava-plugin-locales/avandar.epi": 900 },
  }),
  _chunk({
    fileName: "code.js",
    imports: ["sdk.js"],
    moduleLengths: { [PLUGIN_CODE_MODULE]: 9_000 },
  }),
  _chunk({
    fileName: "runner.js",
    imports: ["sdk.js"],
    moduleLengths: { [RUNNER_MODULE]: 6_000 },
  }),
  _chunk({ fileName: "sdk.js", moduleLengths: { [SDK_MODULE]: 1_000 } }),
];

/** `CORRECT_CHUNKS` with the chunks of the same file name replaced or added. */
function _makeCorrectChunks(
  overrides: readonly ChunkSummary[] = [],
): ChunkSummary[] {
  const overrideFileNames = new Set(
    overrides.map((chunk) => {
      return chunk.fileName;
    }),
  );
  return [
    ...CORRECT_CHUNKS.filter((chunk) => {
      return !overrideFileNames.has(chunk.fileName);
    }),
    ...overrides,
  ];
}

function _checkChunks(
  chunks: readonly ChunkSummary[],
  pluginCount: number = 1,
): string[] {
  return checkPluginBundle({
    pluginsDirectory: PLUGINS_DIRECTORY,
    pluginCount,
    chunks,
  });
}

/**
 * Builds a bundle fixture with only the fields `makeChunkSummariesFromBundle`
 * reads. The `unknown` hop is required: a single `as` does not compile because
 * the fixture omits the other `OutputChunk` fields (`code`, `map`, `exports`,
 * and so on), so TypeScript rejects it as not sufficiently overlapping.
 */
function _makeBundleFromOutputs(
  outputs: Record<string, object>,
): Rollup.OutputBundle {
  return outputs as unknown as Rollup.OutputBundle;
}

describe("checkPluginBundle", () => {
  it("passes when plugin modules load only through the plugin index", () => {
    expect(_checkChunks(_makeCorrectChunks())).toEqual([]);
  });

  it("fails when a plugin module is statically reachable from the entry", () => {
    const violations = _checkChunks([
      _chunk({ fileName: "index.js", isEntry: true, imports: ["shared.js"] }),
      _chunk({
        fileName: "shared.js",
        moduleLengths: { [PLUGIN_CODE_MODULE]: 9_000 },
      }),
    ]);

    expect(violations[0]).toContain("plugins/epidemiology/src/index.tsx");
  });

  it("fails when a lazy route chunk statically imports a plugin module", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "explorer.js",
          imports: ["index.js", "epi-shared.js"],
        }),
        _chunk({
          fileName: "epi-shared.js",
          moduleLengths: {
            "/repo/plugins/epidemiology/src/fitLinearRegression.ts": 2_000,
          },
        }),
      ]),
    );

    expect(violations).toEqual([
      expect.stringContaining(
        "plugins/epidemiology/src/fitLinearRegression.ts is in epi-shared.js",
      ),
    ]);
  });

  it("fails when plugin code shares a chunk with a route", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({ fileName: "code.js", imports: ["sdk.js", "shared.js"] }),
        _chunk({ fileName: "explorer.js", imports: ["shared.js"] }),
        _chunk({
          fileName: "shared.js",
          moduleLengths: { [PLUGIN_CODE_MODULE]: 9_000 },
        }),
      ]),
    );

    expect(violations).toHaveLength(1);
  });

  it("fails when the command runner statically imports a plugin module", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "runner.js",
          imports: ["sdk.js"],
          moduleLengths: { [RUNNER_MODULE]: 6_000, [PLUGIN_CODE_MODULE]: 10 },
        }),
      ]),
    );

    expect(violations).toHaveLength(1);
  });

  it("passes when plugin code lazily loads more of its own code", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "code.js",
          imports: ["sdk.js"],
          dynamicImports: ["code-heavy.js"],
          moduleLengths: { [PLUGIN_CODE_MODULE]: 9_000 },
        }),
        _chunk({
          fileName: "code-heavy.js",
          moduleLengths: { "/repo/plugins/epidemiology/src/heavy.ts": 50_000 },
        }),
      ]),
    );

    expect(violations).toEqual([]);
  });

  it("fails when a plugin manifest module is statically reachable", () => {
    const violations = _checkChunks([
      _chunk({
        fileName: "index.js",
        isEntry: true,
        moduleLengths: {
          "\0virtual:ava-plugin-manifest/avandar.epidemiology": 900,
        },
      }),
    ]);

    expect(violations).toHaveLength(1);
  });

  it("fails when a plugin locales module is statically reachable", () => {
    const violations = _checkChunks([
      _chunk({
        fileName: "index.js",
        isEntry: true,
        moduleLengths: {
          "\0virtual:ava-plugin-locales/avandar.epidemiology": 900,
        },
      }),
    ]);

    expect(violations).toHaveLength(1);
  });

  it("fails when the plugin host exceeds its budget", () => {
    const violations = _checkChunks(
      [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: { [PLUGIN_HOST_MODULE]: HOST_BUDGET_BYTES + 1 },
        }),
      ],
      0,
    );

    expect(violations[0]).toMatch(/plugin host adds .* bytes/);
  });

  it("counts the plugin SDK in an entry chunk toward the host budget", () => {
    const violations = _checkChunks(
      [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: { [SDK_MODULE]: HOST_BUDGET_BYTES + 1 },
        }),
      ],
      0,
    );

    expect(violations[0]).toMatch(/plugin host adds .* bytes/);
  });

  it("raises the host budget for each bundled plugin", () => {
    const violations = _checkChunks(
      [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: {
            [PLUGIN_HOST_MODULE]:
              HOST_BUDGET_BYTES + 2 * PER_PLUGIN_BUDGET_BYTES,
          },
        }),
      ],
      2,
    );

    expect(violations).toEqual([]);
  });

  it("counts host modules in a lazily loaded route chunk", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "explorer.js",
          imports: ["index.js"],
          moduleLengths: { [PLUGIN_HOST_MODULE]: HOST_BUDGET_BYTES },
        }),
      ]),
    );

    expect(violations).toEqual([
      expect.stringMatching(/plugin host adds 28300 bytes/),
    ]);
  });

  it("leaves the lazily loaded command runner out of the host budget", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "runner.js",
          imports: ["sdk.js", "runner-only.js"],
          moduleLengths: { [RUNNER_MODULE]: HOST_BUDGET_BYTES },
        }),
        _chunk({
          fileName: "runner-only.js",
          moduleLengths: {
            "/repo/src/lib/plugins/makePluginApi/makePluginApi.tsx":
              HOST_BUDGET_BYTES,
          },
        }),
      ]),
    );

    expect(violations).toEqual([]);
  });

  it("counts a chunk the command runner shares with a route", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "runner.js",
          imports: ["sdk.js", "explorer.js"],
          moduleLengths: { [RUNNER_MODULE]: 6_000 },
        }),
        _chunk({
          fileName: "explorer.js",
          imports: ["index.js"],
          moduleLengths: { [PLUGIN_HOST_MODULE]: HOST_BUDGET_BYTES },
        }),
      ]),
    );

    expect(violations).toEqual([
      expect.stringMatching(/plugin host adds 28300 bytes/),
    ]);
  });

  it("counts the command runner when the entry imports it statically", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "index.js",
          isEntry: true,
          imports: ["runner.js"],
          dynamicImports: ["layout.js", "explorer.js"],
        }),
        _chunk({
          fileName: "runner.js",
          imports: ["sdk.js"],
          moduleLengths: { [RUNNER_MODULE]: HOST_BUDGET_BYTES },
        }),
      ]),
    );

    expect(violations).toEqual([
      expect.stringMatching(/plugin host adds 29300 bytes/),
    ]);
  });

  it("leaves chunks only plugin code loads out of the host budget", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "code.js",
          imports: ["plugin-sdk.js"],
          moduleLengths: { [PLUGIN_CODE_MODULE]: 9_000 },
        }),
        _chunk({
          fileName: "plugin-sdk.js",
          moduleLengths: { [SDK_MODULE]: HOST_BUDGET_BYTES },
        }),
      ]),
    );

    expect(violations).toEqual([]);
  });
});

describe("makeChunkSummariesFromBundle", () => {
  it("keeps chunks with their imports and module lengths and skips assets", () => {
    const bundle = _makeBundleFromOutputs({
      "index.js": {
        type: "chunk",
        fileName: "index.js",
        isEntry: true,
        imports: ["shared.js"],
        dynamicImports: ["epidemiology.js"],
        modules: { "/repo/src/main.tsx": { renderedLength: 120 } },
      },
      "logo.svg": { type: "asset", fileName: "logo.svg" },
    });

    expect(makeChunkSummariesFromBundle(bundle)).toEqual([
      {
        fileName: "index.js",
        isEntry: true,
        imports: ["shared.js"],
        dynamicImports: ["epidemiology.js"],
        moduleLengths: { "/repo/src/main.tsx": 120 },
      },
    ]);
  });
});
