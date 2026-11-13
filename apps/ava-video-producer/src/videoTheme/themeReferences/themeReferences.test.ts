import assert from "node:assert/strict";
import test from "node:test";
import {
  getTargetFromTokenReference,
  isTokenReference,
} from "./themeReferences";

test("a reference starting with atomic targets the atomic tier", () => {
  assert.deepEqual(getTargetFromTokenReference("$atomic.strokeWidth.sm"), {
    tier: "atomic",
    path: ["strokeWidth", "sm"],
  });
});

test("a reference starting with a Mantine key targets Mantine's theme", () => {
  assert.deepEqual(getTargetFromTokenReference("$colors.primary.4"), {
    tier: "mantine",
    path: ["colors", "primary", "4"],
  });
});

test("any other reference targets the semantic tier", () => {
  assert.deepEqual(getTargetFromTokenReference("$color.accent"), {
    tier: "semantic",
    path: ["color", "accent"],
  });
});

test("$primary targets Mantine's primary colour", () => {
  assert.deepEqual(getTargetFromTokenReference("$primary"), { tier: "primary" });
});

test("colours and malformed paths are not references", () => {
  for (const value of ["#51a7ff", "$", "$.accent", "$color..accent", "color.accent", 4]) {
    assert.equal(isTokenReference(value), false, String(value));
  }
});
