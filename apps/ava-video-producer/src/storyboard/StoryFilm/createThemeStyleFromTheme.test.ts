import assert from "node:assert/strict";
import test from "node:test";
import { makeThemeStyleFromTheme } from "./makeThemeStyleFromTheme";

test("theme tokens become CSS custom properties on the layer", () => {
  assert.deepEqual(
    makeThemeStyleFromTheme({ ground: "var(--brand)", brand: "#1563fe" }),
    { "--ground": "var(--brand)", "--brand": "#1563fe" },
  );
});

test("a missing theme adds no custom properties", () => {
  assert.deepEqual(makeThemeStyleFromTheme(undefined), {});
});
