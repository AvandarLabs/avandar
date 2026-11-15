import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { STOCK_CATALOG, STOCK_IDS } from "../../src/stock/catalog";
import { DECISION_FORK_DENSE_INPUT } from "../../src/stock/presets/DecisionFork/DecisionFork.fixtures";
import { MotionRequests } from "./MotionRequests";

test("motion CLI resolves stable presets and rejects unrecognized commands or selections", () => {
  assert.deepEqual(
    MotionRequests.parseArgs(["list"]).entries.map(({ id }) => id),
    [...STOCK_IDS],
  );
  for (const command of ["preview", "render"]) {
    assert.equal(
      MotionRequests.parseArgs([command, "all"]).entries.length,
      STOCK_CATALOG.length,
    );
    assert.deepEqual(
      MotionRequests.parseArgs([command, "network-graph"]).entries.map(
        ({ id }) => id,
      ),
      ["network-graph"],
    );
  }
  for (const args of [
    [],
    ["unknown"],
    ["render", "unknown-preset"],
    ["render", "../outside"],
    ["preview", "all", "extra"],
  ]) {
    assert.throws(
      () => MotionRequests.parseArgs(args),
      /Usage|Unknown stock motion preset/,
    );
  }
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
  ].forEach((args) =>
    assert.throws(() => MotionRequests.parseArgs(args), /Usage|input/),
  );
});

test("motion input files reject mismatched presets, null documents and partial input before bundling", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "motion-input-"));
  const filename = path.join(directory, "input.json");
  try {
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
