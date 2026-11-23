import assert from "node:assert/strict";
import test from "node:test";
import { getEraseMaskStyle } from "./getEraseMaskStyle";

test("an element that has not started erasing is unmasked", () => {
  assert.deepEqual(getEraseMaskStyle({ progress: 0 }), {});
});
test("a fully erased element is hidden", () => {
  assert.deepEqual(getEraseMaskStyle({ progress: 1 }), { opacity: 0 });
});
test("a half-erased element hides its left side behind a feathered edge", () => {
  const { maskImage } = getEraseMaskStyle({
    progress: 0.5,
    feather: 0.1,
  });
  assert.equal(
    maskImage,
    "linear-gradient(to right, transparent 45%, black 55%)",
  );
});
