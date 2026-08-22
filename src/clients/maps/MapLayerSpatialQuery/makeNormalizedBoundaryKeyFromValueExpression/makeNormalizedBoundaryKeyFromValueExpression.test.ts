import { describe, expect, it } from "vitest";

import { makeNormalizedBoundaryKeyFromValueExpression } from "./makeNormalizedBoundaryKeyFromValueExpression";

describe("makeNormalizedBoundaryKeyFromValueExpression", () => {
  it("normalizes Unicode, accents, case, punctuation, and whitespace", () => {
    const expression =
      makeNormalizedBoundaryKeyFromValueExpression('"district"');

    expect(expression).toContain('nfc_normalize(CAST("district" AS VARCHAR))');
    expect(expression).toContain("strip_accents");
    expect(expression).toContain("lower");
    expect(expression).toContain("regexp_replace");
    expect(expression).toContain("trim");
    expect(expression).toContain("'g'");
  });

  it("nests the steps so each one operates on the previous step's output", () => {
    // Order is the whole contract, and every ordering still contains every
    // function name, so only the composed expression can catch a swap:
    // accents strip from the Unicode-normalized value, punctuation collapses
    // after folding to lower case so the [^a-z0-9] class matches, and trim
    // runs last so it sees the already-collapsed whitespace.
    expect(makeNormalizedBoundaryKeyFromValueExpression('"district"')).toBe(
      "trim(regexp_replace(regexp_replace(lower(strip_accents(" +
        'nfc_normalize(CAST("district" AS VARCHAR)))), ' +
        "'[^a-z0-9]+', ' ', 'g'), '\\s+', ' ', 'g'))",
    );
  });
});
