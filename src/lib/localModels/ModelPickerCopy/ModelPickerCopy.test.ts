import { describe, expect, it } from "vitest";
import { ModelPickerCopy } from "./ModelPickerCopy";

describe("formatModelPickerCopy", () => {
  it("formatModelSelectLabel includes RAM and size", () => {
    expect(
      ModelPickerCopy.formatLabel({
        displayName: "Qwen 2.5 1.5B (offline)",
        systemRequirements: "8 GB RAM",
        approxSizeMb: 900,
      }),
    ).toBe("Qwen 2.5 1.5B (offline) · 8 GB RAM (~900 MB)");
  });

  it("formatModelSelectDescription joins capability and recommendation", () => {
    expect(
      ModelPickerCopy.formatDescription({
        description: "Balanced offline model.",
        recommendedIf: "Recommended if you have 8 GB RAM.",
        approxSizeMb: 900,
      }),
    ).toContain("Balanced offline model.");
    expect(
      ModelPickerCopy.formatDescription({
        description: "Balanced offline model.",
        recommendedIf: "Recommended if you have 8 GB RAM.",
        approxSizeMb: 900,
      }),
    ).toContain("Recommended if you have 8 GB RAM.");
  });
});
