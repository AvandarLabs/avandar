import assert from "node:assert/strict";
import test from "node:test";
import { formatTokenValue } from "./formatTokenValue";

test("lengths read in pixels whether stored as numbers or Mantine strings", () => {
  assert.equal(formatTokenValue("length", 18), "18 px");
  assert.equal(
    formatTokenValue("cssLength", "calc(1.5rem * var(--mantine-scale))"),
    "24 px",
  );
});

test("durations read in milliseconds", () => {
  assert.equal(formatTokenValue("duration", 9), "300 ms");
});

test("opacities read as percentages", () => {
  assert.equal(formatTokenValue("opacity", 0.03), "3%");
});

test("power and bezier curves read differently", () => {
  assert.equal(formatTokenValue("easing", { powerInOut: 3 }), "x^3");
  assert.equal(
    formatTokenValue("easing", [0.16, 1, 0.3, 1]),
    "cubic-bezier(0.16, 1, 0.3, 1)",
  );
});

test("a type style reads as its font, size, and weight", () => {
  assert.equal(
    formatTokenValue("typeStyle", {
      fontId: "arial",
      fontFamily: "Arial, sans-serif",
      fontSize: 17,
      fontWeight: 400,
      color: "#728794",
      alpha: 1,
    }),
    "Arial 17 px 400",
  );
});

test("a missing value reads as empty", () => {
  assert.equal(formatTokenValue("color", undefined), "");
});
