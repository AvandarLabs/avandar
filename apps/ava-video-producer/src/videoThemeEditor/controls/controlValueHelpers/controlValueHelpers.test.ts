import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDashPattern,
  getEnumSelection,
  parseDashDraft,
  parseHexDraft,
  parseNumberInRange,
} from "./controlValueHelpers";

test("a typed hex colour comes back lowercased once it is complete", () => {
  assert.equal(parseHexDraft("#AABBCC", { allowAlpha: true }), "#aabbcc");
  assert.equal(parseHexDraft("#aabbcc80", { allowAlpha: true }), "#aabbcc80");
});

test("a half-typed hex colour is not a value yet", () => {
  assert.equal(parseHexDraft("#aab", { allowAlpha: true }), undefined);
  assert.equal(parseHexDraft("aabbcc", { allowAlpha: true }), undefined);
});

test("a palette shade rejects a hex colour with alpha", () => {
  assert.equal(parseHexDraft("#aabbcc80", { allowAlpha: false }), undefined);
  assert.equal(parseHexDraft("#AABBCC", { allowAlpha: false }), "#aabbcc");
});

test("a typed number is a value only inside its range", () => {
  assert.equal(parseNumberInRange({ value: 0.5, min: 0, max: 1 }), 0.5);
  assert.equal(parseNumberInRange({ value: 1.2, min: 0, max: 1 }), undefined);
  assert.equal(parseNumberInRange({ value: -0.1, min: 0, max: 1 }), undefined);
});

test("a half-typed number is not a value yet", () => {
  assert.equal(parseNumberInRange({ value: "0.", min: 0, max: 1 }), undefined);
  assert.equal(parseNumberInRange({ value: "", min: 0, max: 1 }), undefined);
});

test("dash text accepts spaces or commas and an empty pattern", () => {
  assert.deepEqual(parseDashDraft("6, 6"), [6, 6]);
  assert.deepEqual(parseDashDraft(" 1 4 "), [1, 4]);
  assert.deepEqual(parseDashDraft(""), []);
});

test("dash text rejects negatives, words, and more than eight lengths", () => {
  assert.equal(parseDashDraft("-1 4"), undefined);
  assert.equal(parseDashDraft("dash"), undefined);
  assert.equal(parseDashDraft("1 1 1 1 1 1 1 1 1"), undefined);
});

test("a dash pattern formats as space-separated lengths", () => {
  assert.equal(formatDashPattern([6, 6]), "6 6");
  assert.equal(formatDashPattern([]), "");
});

test("an enum value that is one of the options is the selection", () => {
  assert.equal(getEnumSelection("fast", ["slow", "fast"]), "fast");
});

test("an unset enum value has no selection, not the first option", () => {
  assert.equal(getEnumSelection(undefined, ["slow", "fast"]), undefined);
  assert.equal(getEnumSelection(null, ["slow", "fast"]), undefined);
});

test("an enum value outside the options has no selection", () => {
  assert.equal(getEnumSelection("medium", ["slow", "fast"]), undefined);
  assert.equal(getEnumSelection(3, ["slow", "fast"]), undefined);
});
