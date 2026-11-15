/** Input boundaries preserve authored content without mixing in examples. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { LEGACY_IDS } from "../../../../tests/fixtures/legacyStockIds";
import { STOCK_CATALOG, STOCK_IDS } from "../../catalog";
import { DECISION_FORK_DEFAULT_INPUT } from "../../presets/DecisionFork/DecisionFork.fixtures";
import { stockContracts } from "../../registry/stockContracts";
import { parseStockInput } from "./parseStockInput";
import type { StockJsonValue } from "../StockContract.types";

const CUSTOM_INPUT: typeof DECISION_FORK_DEFAULT_INPUT = {
  prompt: "What happens to this request?",
  branches: [
    { id: "keep", condition: "Keep", outcome: "Continue" },
    { id: "stop", condition: "Stop", outcome: "Review" },
  ],
  selectedBranchId: "keep",
  scenarioLabel: "An authored request",
  selectionLabel: "Chosen by the author",
  showUnchosenOutcomes: false,
};

function _getValueFromPath(
  options: Readonly<{
    value: StockJsonValue;
    path: ReadonlyArray<string | number>;
  }>,
): StockJsonValue | undefined {
  return options.path.reduce<StockJsonValue | undefined>((value, segment) => {
    if (Array.isArray(value)) {
      return typeof segment === "number" ? value[segment] : undefined;
    }
    if (value && typeof value === "object" && typeof segment === "string") {
      return value[segment];
    }
    return undefined;
  }, options.value);
}

test("omitting input resolves the complete fictional example", () => {
  assert.deepEqual(parseStockInput({ preset: "decision-fork" }), {
    prompt: "Where does the fictional sketch belong?",
    branches: [
      { id: "rough", condition: "Still exploring", outcome: "Idea notebook" },
      { id: "ready", condition: "Ready to share", outcome: "Review folder" },
      { id: "archive", condition: "No longer active", outcome: "Archive" },
    ],
    selectedBranchId: "ready",
    scenarioLabel: "A sketch ready for feedback",
    selectionLabel: "Chosen for this example",
    showUnchosenOutcomes: true,
  });
});

test("custom input contains only its two authored branches", () => {
  const parsed = parseStockInput({
    preset: "decision-fork",
    rawInput: CUSTOM_INPUT,
  });
  assert.equal(parsed.branches.length, 2);
  assert.deepEqual(parsed, CUSTOM_INPUT);
  assert.deepEqual(parsed.branches.map(prop("id")), ["keep", "stop"]);
});

test("resolved defaults are independent of later caller edits", () => {
  const parsed = parseStockInput({ preset: "decision-fork" });
  parsed.branches[0].outcome = "Changed by a caller";
  assert.equal(
    parseStockInput({ preset: "decision-fork" }).branches[0].outcome,
    "Idea notebook",
  );
  assert.equal(
    DECISION_FORK_DEFAULT_INPUT.branches[0].outcome,
    "Idea notebook",
  );
});

test("validated custom input is independent of its caller-owned source", () => {
  const custom = structuredClone(CUSTOM_INPUT);
  parseStockInput({
    preset: "decision-fork",
    rawInput: custom,
  }).branches[0].outcome = "Edited";
  assert.equal(custom.branches[0].outcome, "Continue");
});

test("unknown selected branches fail with their preset and field path", () => {
  assert.throws(
    () =>
      parseStockInput({
        preset: "decision-fork",
        rawInput: {
          ...CUSTOM_INPUT,
          selectedBranchId: "missing",
        },
      }),
    /decision-fork.*selectedBranchId.*branch/i,
  );
});

test("duplicate branch IDs fail at the repeated branch ID", () => {
  assert.throws(
    () =>
      parseStockInput({
        preset: "decision-fork",
        rawInput: {
          ...CUSTOM_INPUT,
          branches: [CUSTOM_INPUT.branches[0], CUSTOM_INPUT.branches[0]],
        },
      }),
    /decision-fork.*branches\.1\.id.*unique/i,
  );
});

test("a fifth branch fails instead of increasing the supported layout", () => {
  assert.throws(
    () =>
      parseStockInput({
        preset: "decision-fork",
        rawInput: {
          ...CUSTOM_INPUT,
          branches: ["a", "b", "c", "d", "e"].map((id) => ({
            id,
            condition: id,
            outcome: id,
          })),
          selectedBranchId: "a",
        },
      }),
    /decision-fork.*branches/,
  );
});

test("fewer than two branches fail instead of inventing alternatives", () => {
  assert.throws(
    () =>
      parseStockInput({
        preset: "decision-fork",
        rawInput: {
          ...CUSTOM_INPUT,
          branches: [CUSTOM_INPUT.branches[0]],
        },
      }),
    /decision-fork.*branches/,
  );
});

test("unknown root fields fail instead of being stripped", () => {
  assert.throws(
    () =>
      parseStockInput({
        preset: "decision-fork",
        rawInput: {
          ...CUSTOM_INPUT,
          unexpected: true,
        },
      }),
    /decision-fork.*unexpected/,
  );
});

test("unknown nested fields fail at the authored branch", () => {
  assert.throws(
    () =>
      parseStockInput({
        preset: "decision-fork",
        rawInput: {
          ...CUSTOM_INPUT,
          branches: [
            { ...CUSTOM_INPUT.branches[0], unexpected: true },
            CUSTOM_INPUT.branches[1],
          ],
        },
      }),
    /decision-fork.*branches\.0.*unexpected/,
  );
});

test("supplied incomplete or non-object input never falls back to defaults", () => {
  [null, {}, { prompt: "Only a prompt" }, []].forEach((input) => {
    assert.throws(
      () => parseStockInput({ preset: "decision-fork", rawInput: input }),
      /decision-fork/,
    );
  });
});

test("oversize text fails at every bounded field", () => {
  const invalidInputs = [
    { input: { ...CUSTOM_INPUT, prompt: "p".repeat(53) }, path: "prompt" },
    {
      input: { ...CUSTOM_INPUT, scenarioLabel: "s".repeat(33) },
      path: "scenarioLabel",
    },
    {
      input: { ...CUSTOM_INPUT, selectionLabel: "s".repeat(33) },
      path: "selectionLabel",
    },
    ...[
      { key: "id", length: 21 },
      { key: "condition", length: 25 },
      { key: "outcome", length: 25 },
    ].map(({ key, length }) => ({
      input: {
        ...CUSTOM_INPUT,
        branches: [
          { ...CUSTOM_INPUT.branches[0], [key]: "x".repeat(length) },
          CUSTOM_INPUT.branches[1],
        ],
      },
      path: `branches.0.${key}`,
    })),
  ];
  invalidInputs.forEach(({ input, path }) => {
    assert.throws(
      () => parseStockInput({ preset: "decision-fork", rawInput: input }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes("decision-fork"));
        assert.ok(error.message.includes(path));
        return true;
      },
    );
  });
});

test("nonfinite values cannot enter text fields", () => {
  [NaN, Infinity, -Infinity].forEach((prompt) => {
    assert.throws(
      () =>
        parseStockInput({
          preset: "decision-fork",
          rawInput: { ...CUSTOM_INPUT, prompt },
        }),
      /decision-fork.*prompt/,
    );
  });
});

test("empty required labels fail while an empty qualification stays explicit", () => {
  ["prompt", "scenarioLabel"].forEach((field) => {
    assert.throws(
      () =>
        parseStockInput({
          preset: "decision-fork",
          rawInput: { ...CUSTOM_INPUT, [field]: "" },
        }),
      /decision-fork/,
    );
  });
  assert.equal(
    parseStockInput({
      preset: "decision-fork",
      rawInput: { ...CUSTOM_INPUT, selectionLabel: "" },
    }).selectionLabel,
    "",
  );
});

test("all original public registrations retain their independent stable IDs", () => {
  assert.deepEqual(STOCK_IDS.slice(0, LEGACY_IDS.length), LEGACY_IDS);
  assert.deepEqual(
    STOCK_CATALOG.slice(0, LEGACY_IDS.length).map(prop("id")),
    LEGACY_IDS,
  );
});

test("legacy omission resolves complete defaults and supplied documents remain strict", () => {
  LEGACY_IDS.forEach((preset) => {
    const input = stockContracts[preset].defaultInput;
    assert.deepEqual(parseStockInput({ preset: preset }), input);
    assert.deepEqual(
      parseStockInput({ preset: preset, rawInput: input }),
      input,
    );
    assert.throws(() => parseStockInput({ preset: preset, rawInput: {} }));
    assert.throws(() =>
      parseStockInput({
        preset: preset,
        rawInput: { ...input, unexpected: "Unexposed content" },
      }),
    );
  });
});

test("every named DecisionFork fixture and binding retains a valid selection", () => {
  const contract = stockContracts["decision-fork"];
  [...contract.fixtures, ...contract.bindingExamples].forEach(({ input }) => {
    const parsed = parseStockInput({
      preset: "decision-fork",
      rawInput: input,
    });
    assert.deepEqual(parsed, input);
    assert.equal(
      parsed.branches.filter(({ id }) => id === parsed.selectedBranchId).length,
      1,
    );
  });
});

test("maximum supported text and all four branches remain valid", () => {
  const branches = ["a", "b", "c", "d"].map((id) => ({
    id: id.repeat(20),
    condition: "c".repeat(24),
    outcome: "o".repeat(24),
  }));
  const input = {
    prompt: "p".repeat(52),
    branches,
    selectedBranchId: branches[3].id,
    scenarioLabel: "s".repeat(32),
    selectionLabel: "s".repeat(32),
    showUnchosenOutcomes: false,
  };
  assert.deepEqual(
    parseStockInput({ preset: "decision-fork", rawInput: input }),
    input,
  );
});

test("default-text paths resolve every visible string in the complete example", () => {
  const { defaultTextPaths, defaultInput } = stockContracts["decision-fork"];
  assert.deepEqual(
    defaultTextPaths.map((path) =>
      _getValueFromPath({ value: defaultInput, path }),
    ),
    [
      "Where does the fictional sketch belong?",
      "Still exploring",
      "Idea notebook",
      "Ready to share",
      "Review folder",
      "No longer active",
      "Archive",
      "A sketch ready for feedback",
      "Chosen for this example",
    ],
  );
});

test("default-text paths exclude stable IDs, selection references and booleans", () => {
  const paths = new Set(
    stockContracts["decision-fork"].defaultTextPaths.map((path) =>
      JSON.stringify(path),
    ),
  );
  [
    ["branches", 0, "id"],
    ["branches", 1, "id"],
    ["branches", 2, "id"],
    ["selectedBranchId"],
    ["showUnchosenOutcomes"],
  ].forEach((path) => {
    assert.equal(paths.has(JSON.stringify(path)), false);
  });
});
