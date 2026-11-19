import assert from "node:assert/strict";
import test from "node:test";
import { getHorizontalBlurFilter } from "./getHorizontalBlurFilter";

test("a visible horizontal blur references its SVG filter", () => {
  assert.equal(getHorizontalBlurFilter("whip", 12), "url(#whip)");
});

test("a blur too small to see applies no filter", () => {
  assert.equal(getHorizontalBlurFilter("whip", 0.1), undefined);
});
