import assert from "node:assert/strict";
import test from "node:test";
import { CONTINUITY_CATALOG } from "../src/continuity/continuityCatalog";

test("every reusable composition has distinct retrieval tags and creative direction", () => {
  CONTINUITY_CATALOG.filter((entry) => entry.family === "vocabulary").forEach(
    (entry) => {
      assert.ok(entry.title.trim(), entry.id);
      assert.ok(entry.goodFor.trim(), entry.id);
      assert.ok(entry.tags?.length >= 3, `${entry.id} needs retrieval tags`);
      assert.equal(new Set(entry.tags).size, entry.tags.length, entry.id);
      assert.ok(
        entry.tags.every((tag) => tag.trim().length > 0),
        entry.id,
      );
      assert.ok(entry.creativeDirection?.trim(), `${entry.id} needs direction`);
      assert.notEqual(entry.creativeDirection, entry.description, entry.id);
    },
  );
});
