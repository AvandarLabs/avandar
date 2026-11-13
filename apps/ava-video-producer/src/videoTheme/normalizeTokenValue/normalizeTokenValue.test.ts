import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTokenValue, parseCssPixels } from "./normalizeTokenValue";

test("Mantine rem lengths resolve to pixels at the default scale", () => {
  assert.equal(parseCssPixels("calc(0.75rem * var(--mantine-scale))"), 12);
});

test("pixel strings resolve to numbers", () => {
  assert.deepEqual(normalizeTokenValue({ kind: "length" }, "48px"), { ok: true, value: 48 });
});

test("numeric strings from Mantine resolve to numbers", () => {
  assert.deepEqual(normalizeTokenValue({ kind: "fontWeight" }, "600"), { ok: true, value: 600 });
});

test("a Mantine font stack resolves to its registered font", () => {
  assert.deepEqual(
    normalizeTokenValue({ kind: "fontFamily" }, "Figtree, ui-sans-serif, system-ui, sans-serif"),
    { ok: true, value: "figtree" },
  );
});

test("a colour token rejects a length", () => {
  assert.equal(normalizeTokenValue({ kind: "color" }, "18px").ok, false);
});

test("a colour becomes a solid fill and a gradient stays a gradient", () => {
  assert.deepEqual(normalizeTokenValue({ kind: "fill" }, "#0b1219"), {
    ok: true,
    value: { type: "solid", color: "#0b1219" },
  });
  assert.deepEqual(
    normalizeTokenValue({ kind: "fill" }, { from: "#000000", to: "#ffffff", deg: 90 }),
    { ok: true, value: { type: "gradient", from: "#000000", to: "#ffffff", deg: 90 } },
  );
});
