import { describe, expect, it } from "vitest";

import { detectBias } from "@/components/privacy/privacy-helpers/detectBias/detectBias";

describe("detectBias", () => {
  it("returns no hits for empty input", () => {
    expect(detectBias("").hits).toHaveLength(0);
    expect(detectBias("   ").hits).toHaveLength(0);
  });

  it("returns no hits for neutral data questions", () => {
    expect(detectBias("show me revenue by month").hits).toHaveLength(0);
    expect(
      detectBias("what is the average household size in the dataset").hits,
    ).toHaveLength(0);
  });

  it("flags gender generalizations", () => {
    const result = detectBias("women are always more careful with money");
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]?.category).toBe("gender_generalization");
    expect(result.hits[0]?.suggestion).toBeTruthy();
  });

  it("does not flag affirming statements about diversity", () => {
    expect(detectBias("women are diverse in our dataset").hits).toHaveLength(0);
  });

  it("flags ethnic generalizations", () => {
    const result = detectBias(
      "african communities are always more religious than others",
    );
    expect(result.hits[0]?.category).toBe("ethnic_cultural_generalization");
  });

  it("flags loaded cultural descriptors", () => {
    const result = detectBias(
      "compare outcomes in third world versus developed countries",
    );
    expect(result.hits[0]?.label).toContain("Loaded cultural descriptor");
  });

  it('flags loaded "why are X poor" framing', () => {
    const result = detectBias("why are women in rural areas poor");
    expect(
      result.hits.some((h) => {
        return h.category === "loaded_framing";
      }),
    ).toBe(true);
  });

  it('flags "what\'s wrong with" framing', () => {
    const result = detectBias("what's wrong with this region's literacy rate");
    expect(
      result.hits.some((h) => {
        return h.category === "loaded_framing";
      }),
    ).toBe(true);
  });

  it('flags "normal household" framing', () => {
    const result = detectBias(
      "compare normal households to single-parent ones",
    );
    expect(result.hits[0]?.label).toContain("Normal");
  });

  it('flags statistical assumptions ("average woman")', () => {
    const result = detectBias(
      "show me the income of the average woman in the dataset",
    );
    expect(result.hits[0]?.category).toBe("statistical_assumption");
  });

  it("deduplicates by label", () => {
    const text = "women are always X. women are never Y. women are usually Z.";
    const result = detectBias(text);
    const generalizationHits = result.hits.filter((h) => {
      return h.category === "gender_generalization";
    });
    // We may have multiple gender_generalization rules fire, but each one
    // only fires once.
    const labels = new Set(
      generalizationHits.map((h) => {
        return h.label;
      }),
    );
    expect(generalizationHits.length).toBe(labels.size);
  });
});
