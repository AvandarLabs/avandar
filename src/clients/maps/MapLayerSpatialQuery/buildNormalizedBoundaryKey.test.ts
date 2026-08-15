import { describe, expect, it } from "vitest";
import { buildNormalizedBoundaryKey } from "./buildNormalizedBoundaryKey";

describe("buildNormalizedBoundaryKey", () => {
  it("normalizes Unicode, accents, case, punctuation, and whitespace", () => {
    const expression = buildNormalizedBoundaryKey('"district"');

    expect(expression).toContain('nfc_normalize(CAST("district" AS VARCHAR))');
    expect(expression).toContain("strip_accents");
    expect(expression).toContain("lower");
    expect(expression).toContain("regexp_replace");
    expect(expression).toContain("trim");
    expect(expression).toContain("'g'");
  });

  it("makes punctuation and Unicode variants share one SQL normalization path", () => {
    const expression = buildNormalizedBoundaryKey("candidate_key");
    for (const sample of [
      "Nord-Kivu",
      "Nord Kivu",
      "NORD KIVU",
      "Québec",
      "Québec",
    ]) {
      expect(expression.replace("candidate_key", `'${sample}'`)).toContain(
        "nfc_normalize",
      );
    }
  });
});
