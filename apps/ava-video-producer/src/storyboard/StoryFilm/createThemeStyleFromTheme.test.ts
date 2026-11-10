import assert from "node:assert/strict";
import test from "node:test";
import { createThemeStyleFromTheme } from "./createThemeStyleFromTheme";

test("theme tokens become CSS custom properties on the layer", () => {
  assert.deepEqual(
    createThemeStyleFromTheme({ ground: "var(--brand)", brand: "#1563fe" }),
    { "--ground": "var(--brand)", "--brand": "#1563fe" },
  );
});

test("a missing theme adds no custom properties", () => {
  assert.deepEqual(createThemeStyleFromTheme(undefined), {});
});
