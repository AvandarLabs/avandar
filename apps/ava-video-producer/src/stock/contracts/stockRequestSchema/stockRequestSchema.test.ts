import assert from "node:assert/strict";
import test from "node:test";
import { DECISION_FORK_DENSE_INPUT } from "../../presets/DecisionFork/DecisionFork.fixtures";
import { stockContracts } from "../../registry/stockContracts";
import { stockRequestSchema } from "./stockRequestSchema";

test("omitting input produces independent complete examples with explicit versions", () => {
  const first = stockRequestSchema.parse({ preset: "decision-fork" });
  const second = stockRequestSchema.parse({ preset: "decision-fork" });
  if (first.preset !== "decision-fork" || second.preset !== "decision-fork") {
    throw new Error("Expected decision forks");
  }
  first.input.branches[0].outcome = "Edited example";
  assert.equal(second.schemaVersion, 1);
  assert.equal(second.input.branches[0].outcome, "Idea notebook");
  assert.equal(second.input.branches.length, 3);
  assert.deepEqual(
    stockRequestSchema.parse({ preset: "network-graph" }).input,
    stockContracts["network-graph"].defaultInput,
  );
});

test("strict stock requests reject unknown fields, versions and unsafe palettes", () => {
  Array.from([
    { preset: "decision-fork", schemaVersion: 2 },
    { preset: "decision-fork", unknownField: true },
    { preset: "decision-fork", accent: "#fff" },
    { preset: "decision-fork", background: "url(https://example.com)" },
    { preset: "decision-fork", input: { prompt: "Only the prompt" } },
    {
      preset: "decision-fork",
      input: { ...DECISION_FORK_DENSE_INPUT, selectedBranchId: "missing" },
    },
    {
      preset: "decision-fork",
      input: { ...DECISION_FORK_DENSE_INPUT, extra: true },
    },
    { preset: "network-graph", input: DECISION_FORK_DENSE_INPUT },
  ]).forEach((request) => {
    assert.equal(stockRequestSchema.safeParse(request).success, false);
  });
});
