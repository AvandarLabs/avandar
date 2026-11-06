import assert from "node:assert/strict";
import test from "node:test";
import { decodeDefaultSpan } from "./decodeDefaultSpan";

test("one explicit content pair preserves exact prefix, selection and suffix UTF-16 lengths", () => {
  assert.deepEqual(decodeDefaultSpan("Pré 👩‍🔬 <content>é</content> fin"), {
    text: "Pré 👩‍🔬 é fin",
    contentStart: 10,
    contentEnd: 12,
  });
  assert.deepEqual(decodeDefaultSpan("<content>Lieu</content> "), {
    text: "Lieu ",
    contentStart: 0,
    contentEnd: 4,
  });
  assert.deepEqual(decodeDefaultSpan("about <content>-0.5</content> items"), {
    text: "about -0.5 items",
    contentStart: 6,
    contentEnd: 10,
  });
});
test("missing, duplicate, nested and reversed markers reject deterministically", () => {
  [
    "plain text",
    "<content>x",
    "x</content>",
    "</content>x<content>",
    "<content>a</content><content>b</content>",
    "<content><content>x</content></content>",
    "<content>x</content></content>",
    "<content><content>x</content>",
  ].forEach((template) =>
    assert.throws(() => decodeDefaultSpan(template), /content/),
  );
});
