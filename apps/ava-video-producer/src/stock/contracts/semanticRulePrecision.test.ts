import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import budgets from "../../../tests/fixtures/legacyTextBudgets.json";
import { stockContracts } from "../registry/stockContracts";
import type { StockContract } from "./StockContract.types";

const contracts: Record<string, StockContract<unknown>> = stockContracts;
test("legacy semantic exports specify each runtime text budget with exact positions and numeric limits", () => {
  budgets.forEach(({ preset, paths, fontSize, width, mono }) => {
    const rule = contracts[preset].semanticRules.find(
      (candidate) =>
        paths.every((path) => candidate.paths.includes(path)) &&
        candidate.description.includes(`${fontSize}px`) &&
        candidate.description.includes(`${width}px`),
    );
    assert.ok(rule, `${preset}: ${paths.join(",")} ${fontSize}px / ${width}px`);
    assert.ok(rule.description.includes(mono ? "Courier" : "Arial"));
  });
});
test("revision export names the compared saved content paths", () => {
  assert.ok(
    stockContracts["revision-restore"].semanticRules
      .find(({ id }) => id === "saved-history")!
      .paths.includes("revisions.*.content"),
  );
});
test("contact export preserves axis equality and the explicit both-null alternative", () => {
  const rules = stockContracts["contact-window-overlap"].semanticRules;
  [
    "investigationWindow.start",
    "investigationWindow.end",
    "records.*.start",
    "records.*.end",
    "axis.end",
  ].forEach((path) =>
    assert.ok(
      rules.some((rule) => rule.paths.includes(path)),
      path,
    ),
  );
  const description = rules.map(prop("description")).join(" ");
  assert.match(description, /start < investigationWindow.end <= axis.end/);
  assert.match(description, /both null/);
  assert.match(description, /start < end <= axis.end/);
});
test("detour export includes stationary and endpoint contact with the blocked open interior", () => {
  const rule = stockContracts["convoy-route-detour"].semanticRules.find(
    ({ id }) => id === "convoy-route-detour.3",
  )!;
  assert.match(rule.description, /stationary/);
  assert.match(rule.description, /detour endpoint/);
});
test("traversal export covers unused edge endpoints without rejecting duplicate directed edges", () => {
  const contract = stockContracts["node-traversal"];
  const rule = contract.semanticRules.find(
    ({ id }) => id === "connected-route",
  )!;
  assert.match(rule.description, /unused/);
  assert.match(rule.description, /distinct/);
  const input = {
    ...contract.defaultInput,
    nodes: contract.defaultInput.nodes.slice(0, 2),
    edges: [
      [0, 1],
      [0, 1],
    ],
    route: [0, 1],
  };
  assert.equal(contract.inputSchema.safeParse(input).success, true);
  [
    [0, 0],
    [0, 2],
  ].forEach((edge) =>
    assert.equal(
      contract.inputSchema.safeParse({
        ...input,
        edges: [input.edges[0], edge],
      }).success,
      false,
    ),
  );
});
test("utterance export specifies bounded case-insensitive leading article normalization", () => {
  const description = stockContracts["utterance-to-model-draft"].semanticRules
    .map(prop("description"))
    .join(" ");
  assert.match(description, /at most one leading English article/);
  assert.match(description, /case-insensitively/);
  assert.match(description, /followed by whitespace/);
});
