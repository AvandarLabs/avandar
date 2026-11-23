import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { prop } from "@avandar/utils";
import { DECISION_FORK_DENSE_INPUT } from "../../src/stock/presets/DecisionFork/DecisionFork.fixtures";
import { STOCK_CATALOG, STOCK_IDS } from "../../src/stock/stockEntry";
import { MotionRequests } from "./MotionRequests";

test("motion CLI resolves stable presets and rejects unrecognized commands or selections", () => {
  assert.deepEqual(MotionRequests.parseArgs(["list"]).entries.map(prop("id")), [
    ...STOCK_IDS,
  ]);
  ["preview", "render"].forEach((command) => {
    assert.equal(
      MotionRequests.parseArgs([command, "all"]).entries.length,
      STOCK_CATALOG.length,
    );
    assert.deepEqual(
      MotionRequests.parseArgs([command, "network-graph"]).entries.map(
        prop("id"),
      ),
      ["network-graph"],
    );
  });
  [
    [],
    ["unknown"],
    ["render", "unknown-preset"],
    ["render", "../outside"],
    ["preview", "all", "extra"],
  ].forEach((args) => {
    assert.throws(() => {
      return MotionRequests.parseArgs(args);
    }, /Usage|Unknown stock motion preset/);
  });
});

test("motion CLI accepts one input file only for a selected preset", () => {
  assert.equal(
    MotionRequests.parseArgs([
      "preview",
      "decision-fork",
      "--input",
      "out/motion/inputs/decision-fork.json",
    ]).inputFile,
    "out/motion/inputs/decision-fork.json",
  );
  assert.equal(
    MotionRequests.parseArgs([
      "render",
      "decision-fork",
      "--input",
      "authored.json",
    ]).inputFile,
    "authored.json",
  );
  [
    ["preview", "all", "--input", "authored.json"],
    ["render", "all", "--input", "authored.json"],
    ["list", "decision-fork", "--input", "authored.json"],
    ["preview", "decision-fork", "--input"],
  ].forEach((args) => {
    return assert.throws(() => {
      return MotionRequests.parseArgs(args);
    }, /Usage|input/);
  });
});

test("motion input files reject mismatched presets, null documents and partial input before bundling", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "motion-input-"));
  const filename = path.join(directory, "input.json");
  try {
    const { args } = await _assertConfiguredMotionInput(filename);
    await fs.writeFile(filename, "null");
    await assert.rejects(MotionRequests.fromArgs({ args }));
    await fs.writeFile(
      filename,
      JSON.stringify({
        preset: "decision-fork",
        input: { prompt: "Incomplete" },
      }),
    );
    await assert.rejects(MotionRequests.fromArgs({ args }), /input/);
    await fs.writeFile(
      filename,
      JSON.stringify({ preset: "decision-fork", unknown: true }),
    );
    await assert.rejects(MotionRequests.fromArgs({ args }), /unknown/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("pnpm's forwarded separator preserves the documented motion commands", () => {
  assert.deepEqual(
    MotionRequests.parseArgs([
      "--",
      "preview",
      "decision-fork",
      "--input",
      "authored.json",
    ]),
    MotionRequests.parseArgs([
      "preview",
      "decision-fork",
      "--input",
      "authored.json",
    ]),
  );
  assert.equal(MotionRequests.parseArgs(["--", "list"]).command, "list");
});

test("motion CLI accepts one theme for any selection", () => {
  assert.equal(
    MotionRequests.parseArgs(["render", "all", "--theme", "avandar"]).themeId,
    "avandar",
  );
  assert.equal(
    MotionRequests.parseArgs(["preview", "network-graph"]).themeId,
    "classic",
  );
});

test("motion CLI refuses a theme when listing", () => {
  assert.throws(() => {
    return MotionRequests.parseArgs(["list", "all", "--theme", "avandar"]);
  }, /Usage/);
});

test("default motion requests carry no colours so the theme decides", async () => {
  const [request] = await MotionRequests.fromArgs({
    args: MotionRequests.parseArgs(["preview", "network-graph"]),
  });
  assert.equal(request.request.accent, undefined);
  assert.equal(request.theme.themeId, "classic");
});

async function _assertConfiguredMotionInput(
  filename: string,
): Promise<Readonly<{ args: ReturnType<typeof MotionRequests.parseArgs> }>> {
  await fs.writeFile(
    filename,
    JSON.stringify({
      preset: "decision-fork",
      schemaVersion: 1,
      input: DECISION_FORK_DENSE_INPUT,
      accent: "#aabbcc",
      background: "#112233",
    }),
  );
  const args = MotionRequests.parseArgs([
    "preview",
    "decision-fork",
    "--input",
    filename,
  ]);
  const [resolved] = await MotionRequests.fromArgs({ args });
  assert.deepEqual(resolved.request.input, DECISION_FORK_DENSE_INPUT);
  assert.ok(Object.isFrozen(resolved.request.input));
  assert.equal(resolved.request.accent, "#aabbcc");
  await assert.rejects(
    MotionRequests.fromArgs({
      args: MotionRequests.parseArgs([
        "preview",
        "network-graph",
        "--input",
        filename,
      ]),
    }),
    /preset/,
  );
  return { args };
}
