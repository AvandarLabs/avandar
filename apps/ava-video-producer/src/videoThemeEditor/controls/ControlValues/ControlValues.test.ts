import assert from "node:assert/strict";
import test from "node:test";
import { ControlValues } from "./ControlValues";

test("a typed hex colour comes back lowercased once it is complete", () => {
  assert.equal(
    ControlValues.parseHexDraft({
      text: "#AABBCC",
      options: { allowAlpha: true },
    }),
    "#aabbcc",
  );
  assert.equal(
    ControlValues.parseHexDraft({
      text: "#aabbcc80",
      options: { allowAlpha: true },
    }),
    "#aabbcc80",
  );
});
test("a half-typed hex colour is not a value yet", () => {
  assert.equal(
    ControlValues.parseHexDraft({
      text: "#aab",
      options: { allowAlpha: true },
    }),
    undefined,
  );
  assert.equal(
    ControlValues.parseHexDraft({
      text: "aabbcc",
      options: { allowAlpha: true },
    }),
    undefined,
  );
});
test("a palette shade rejects a hex colour with alpha", () => {
  assert.equal(
    ControlValues.parseHexDraft({
      text: "#aabbcc80",
      options: { allowAlpha: false },
    }),
    undefined,
  );
  assert.equal(
    ControlValues.parseHexDraft({
      text: "#AABBCC",
      options: { allowAlpha: false },
    }),
    "#aabbcc",
  );
});
test("a typed number is a value only inside its range", () => {
  assert.equal(
    ControlValues.parseNumberInRange({ value: 0.5, min: 0, max: 1 }),
    0.5,
  );
  assert.equal(
    ControlValues.parseNumberInRange({ value: 1.2, min: 0, max: 1 }),
    undefined,
  );
  assert.equal(
    ControlValues.parseNumberInRange({ value: -0.1, min: 0, max: 1 }),
    undefined,
  );
});
test("a half-typed number is not a value yet", () => {
  assert.equal(
    ControlValues.parseNumberInRange({ value: "0.", min: 0, max: 1 }),
    undefined,
  );
  assert.equal(
    ControlValues.parseNumberInRange({ value: "", min: 0, max: 1 }),
    undefined,
  );
});
test("dash text accepts spaces or commas and an empty pattern", () => {
  assert.deepEqual(ControlValues.parseDashDraft("6, 6"), [6, 6]);
  assert.deepEqual(ControlValues.parseDashDraft(" 1 4 "), [1, 4]);
  assert.deepEqual(ControlValues.parseDashDraft(""), []);
});
test("dash text rejects negatives, words, and more than eight lengths", () => {
  assert.equal(ControlValues.parseDashDraft("-1 4"), undefined);
  assert.equal(ControlValues.parseDashDraft("dash"), undefined);
  assert.equal(ControlValues.parseDashDraft("1 1 1 1 1 1 1 1 1"), undefined);
});
test("a dash pattern formats as space-separated lengths", () => {
  assert.equal(ControlValues.formatDashPattern([6, 6]), "6 6");
  assert.equal(ControlValues.formatDashPattern([]), "");
});
test("an enum value that is one of the options is the selection", () => {
  assert.equal(
    ControlValues.getEnumSelection({
      value: "fast",
      options: ["slow", "fast"],
    }),
    "fast",
  );
});
test("an unset enum value has no selection, not the first option", () => {
  assert.equal(
    ControlValues.getEnumSelection({
      value: undefined,
      options: ["slow", "fast"],
    }),
    undefined,
  );
  assert.equal(
    ControlValues.getEnumSelection({
      value: null,
      options: ["slow", "fast"],
    }),
    undefined,
  );
});
test("an enum value outside the options has no selection", () => {
  assert.equal(
    ControlValues.getEnumSelection({
      value: "medium",
      options: ["slow", "fast"],
    }),
    undefined,
  );
  assert.equal(
    ControlValues.getEnumSelection({
      value: 3,
      options: ["slow", "fast"],
    }),
    undefined,
  );
});
