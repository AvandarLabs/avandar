import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTokenValue } from "./normalizeTokenValue";

test("pixel strings resolve to numbers", () => {
  assert.deepEqual(
    normalizeTokenValue({
      field: { kind: "length" },
      value: "48px",
    }),
    {
      ok: true,
      value: 48,
    },
  );
});
test("numeric strings from Mantine resolve to numbers", () => {
  assert.deepEqual(
    normalizeTokenValue({
      field: { kind: "fontWeight" },
      value: "600",
    }),
    {
      ok: true,
      value: 600,
    },
  );
});
test("a Mantine font stack resolves to its registered font", () => {
  assert.deepEqual(
    normalizeTokenValue({
      field: { kind: "fontFamily" },
      value: "Figtree, ui-sans-serif, system-ui, sans-serif",
    }),
    { ok: true, value: "figtree" },
  );
});
test("a colour token rejects a length", () => {
  assert.equal(
    normalizeTokenValue({
      field: { kind: "color" },
      value: "18px",
    }).ok,
    false,
  );
});
test("a colour becomes a solid fill and a gradient stays a gradient", () => {
  assert.deepEqual(
    normalizeTokenValue({
      field: { kind: "fill" },
      value: "#0b1219",
    }),
    {
      ok: true,
      value: { type: "solid", color: "#0b1219" },
    },
  );
  assert.deepEqual(
    normalizeTokenValue({
      field: { kind: "fill" },
      value: { from: "#000000", to: "#ffffff", deg: 90 },
    }),
    {
      ok: true,
      value: { type: "gradient", from: "#000000", to: "#ffffff", deg: 90 },
    },
  );
});
