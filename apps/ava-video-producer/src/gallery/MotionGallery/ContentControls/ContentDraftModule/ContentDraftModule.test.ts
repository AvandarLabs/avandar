import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { stockContracts } from "../../../../stock/registry/stockContracts";
import { ContentDraftModule } from "./ContentDraftModule";

/** Draft validation keeps authored errors separate from renderable content. */
test("invalid drafts retain the last valid preview and disable export", () => {
  const initial = ContentDraftModule.fromPreset("decision-fork");
  const invalid = ContentDraftModule.edit({
    preset: "decision-fork",
    state: initial,
    path: ["prompt"],
    value: "",
  });
  assert.equal(invalid.isValid, false);
  assert.deepEqual(invalid.resolvedInput, initial.resolvedInput);
  assert.ok(invalid.issues.some((issue) => issue.path.join(".") === "prompt"));
});
test("reset restores the complete independent default", () => {
  const initial = ContentDraftModule.fromPreset("decision-fork");
  const edited = ContentDraftModule.edit({
    preset: "decision-fork",
    state: initial,
    path: ["scenarioLabel"],
    value: "My scenario",
  });
  const reset = ContentDraftModule.resetFromPreset("decision-fork");
  assert.deepEqual(reset.draft, initial.draft);
  assert.notEqual(reset.draft, initial.draft);
  assert.notDeepEqual(edited.draft, reset.draft);
});
test("removing the selected branch reports a dangling reference without changing labels", () => {
  const initial = ContentDraftModule.fromPreset("decision-fork");
  const input = stockContracts["decision-fork"].defaultInput;
  const index = input.branches.findIndex(propEq("id", input.selectedBranchId));
  const removed = ContentDraftModule.removeItem({
    preset: "decision-fork",
    state: initial,
    path: ["branches"],
    index,
  });
  assert.equal(removed.isValid, false);
  assert.ok(
    removed.issues.some((issue) => issue.path.join(".") === "selectedBranchId"),
  );
  assert.deepEqual(
    (removed.draft as typeof input).branches,
    input.branches.filter((_, position) => position !== index),
  );
});
test("one preset's edits cannot mutate another draft or the canonical defaults", () => {
  const initial = ContentDraftModule.fromPreset("decision-fork");
  const other = ContentDraftModule.fromPreset("word-reveal");
  const snapshot = structuredClone(other);
  ContentDraftModule.edit({
    preset: "decision-fork",
    state: initial,
    path: ["prompt"],
    value: "Changed prompt",
  });
  assert.deepEqual(other, snapshot);
  assert.deepEqual(initial.draft, stockContracts["decision-fork"].defaultInput);
});
test("adding a blank branch updates valid resolved content with a unique ID", () => {
  const initial = ContentDraftModule.fromPreset("decision-fork");
  const control = stockContracts["decision-fork"].controls.find(
    (item): item is Extract<typeof item, { kind: "collection" }> =>
      propEq<typeof item, "kind", (typeof item)["kind"]>(
        "kind",
        "collection",
      )(item),
  )!;
  assert.equal(control.kind, "collection");
  if (control.kind !== "collection") {
    throw new Error("Expected collection");
  }
  const added = ContentDraftModule.addItem({
    preset: "decision-fork",
    state: initial,
    path: ["branches"],
    schema: control.itemSchema,
  });
  const branches = (
    added.draft as (typeof stockContracts)["decision-fork"]["defaultInput"]
  ).branches;
  assert.equal(branches.at(-1)?.condition, "");
  assert.equal(branches.at(-1)?.outcome, "");
  assert.equal(new Set(branches.map(prop("id"))).size, branches.length);
  assert.equal(added.isValid, true);
  assert.deepEqual(added.issues, []);
  assert.deepEqual(added.resolvedInput, added.draft);
  assert.notDeepEqual(added.resolvedInput, initial.resolvedInput);
});
test("primitive rows retain editor identity after removing a preceding row", () => {
  const initial = ContentDraftModule.fromPreset("word-reveal");
  const arrayPath = Object.keys(initial.rowKeys)[0];
  assert.ok(arrayPath);
  const keys = initial.rowKeys[arrayPath];
  const removed = ContentDraftModule.removeItem({
    preset: "word-reveal",
    state: initial,
    path: JSON.parse(arrayPath),
    index: 0,
  });
  assert.deepEqual(removed.rowKeys[arrayPath], keys.slice(1));
  assert.ok(!JSON.stringify(removed.draft).includes("editor-row"));
});
