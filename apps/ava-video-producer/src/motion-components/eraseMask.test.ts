import assert from "node:assert/strict";
import test from "node:test";
import { getEraseMaskStyle } from "./eraseMask";

test("an element that has not started erasing is unmasked", () => {
  assert.deepEqual(getEraseMaskStyle(0), {});
});

test("a fully erased element is hidden", () => {
  assert.deepEqual(getEraseMaskStyle(1), { opacity: 0 });
});

test("a half-erased element hides its left side behind a feathered edge", () => {
  const { maskImage } = getEraseMaskStyle(0.5, 0.1);
  assert.equal(
    maskImage,
    "linear-gradient(to right, transparent 45%, black 55%)",
  );
});
