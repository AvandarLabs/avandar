import assert from "node:assert/strict";
import test from "node:test";
import { ThemeReferences } from "./ThemeReferences";

test("a reference starting with atomic targets the atomic tier", () => {
  assert.deepEqual(
    ThemeReferences.getTargetFromTokenReference("$atomic.strokeWidth.sm"),
    {
      tier: "atomic",
      path: ["strokeWidth", "sm"],
    },
  );
});

test("a reference starting with a Mantine key targets Mantine's theme", () => {
  assert.deepEqual(
    ThemeReferences.getTargetFromTokenReference("$colors.primary.4"),
    {
      tier: "mantine",
      path: ["colors", "primary", "4"],
    },
  );
});

test("any other reference targets the semantic tier", () => {
  assert.deepEqual(
    ThemeReferences.getTargetFromTokenReference("$color.accent"),
    {
      tier: "semantic",
      path: ["color", "accent"],
    },
  );
});

test("$primary targets Mantine's primary colour", () => {
  assert.deepEqual(ThemeReferences.getTargetFromTokenReference("$primary"), {
    tier: "primary",
  });
});

test("colours and malformed paths are not references", () => {
  ["#51a7ff", "$", "$.accent", "$color..accent", "color.accent", 4].forEach(
    (value) => {
      assert.equal(
        ThemeReferences.isTokenReference(value),
        false,
        String(value),
      );
    },
  );
});
