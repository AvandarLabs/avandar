import assert from "node:assert/strict";
import test from "node:test";
import { CONTINUITY_CATALOG } from "../../continuityCatalog";
import { buildCompositionSearchTextFromEntry } from "./buildCompositionSearchTextFromEntry";

test("retrieval text normalizes semantic prose without including source or control paths", () => {
  const entry = {
    ...CONTINUITY_CATALOG.filter(
      (candidate) => candidate.family === "vocabulary",
    )[0]!,
    title: "  Persistent\n object ",
    tags: ["identity   continuity"],
  };
  const text = buildCompositionSearchTextFromEntry(entry);
  assert.ok(text.startsWith("Persistent object\n"));
  assert.ok(text.includes("identity continuity"));
  assert.ok(text.includes(entry.goodFor));
  assert.ok(text.includes(entry.creativeDirection));
  assert.ok(!text.includes(entry.path));
  entry.controls.forEach((control) => assert.ok(!text.includes(control.path)));
});
