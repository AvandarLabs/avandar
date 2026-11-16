import assert from "node:assert/strict";
import test from "node:test";
import { parseCssPixels } from "./parseCssPixels";

test("Mantine rem lengths resolve to pixels at the default scale", () => {
  assert.equal(parseCssPixels("calc(0.75rem * var(--mantine-scale))"), 12);
});
