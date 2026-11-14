import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTokenDescriptorsSource,
  getTokenMessagesFromCatalog,
} from "./buildTokenDescriptorsSource";

test("every catalog label and description becomes one descriptor", () => {
  const source = buildTokenDescriptorsSource();
  assert.equal(
    source.match(/msg\(/g)?.length,
    getTokenMessagesFromCatalog().length,
  );
  assert.ok(source.includes('id: "tokens.Accent"'));
  assert.ok(
    source.includes('"tokens.The path, packet, or object a motion is about."'),
  );
});

test("ICU braces and quotes in copy stay literal", () => {
  assert.ok(
    buildTokenDescriptorsSource(["Use {braces} and it's"]).includes(
      `message: "Use '{'braces'}' and it''s"`,
    ),
  );
});
