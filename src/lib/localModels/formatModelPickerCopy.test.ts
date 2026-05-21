import { describe, expect, it } from "vitest";
import {
  formatModelSelectDescription,
  formatModelSelectLabel,
} from "./formatModelPickerCopy";

describe("formatModelPickerCopy", () => {
  it("formatModelSelectLabel includes RAM and size", () => {
    expect(
      formatModelSelectLabel({
        displayName: "Qwen 2.5 1.5B (offline)",
        systemRequirements: "8 GB RAM",
        approxSizeMb: 900,
      }),
    ).toBe("Qwen 2.5 1.5B (offline) · 8 GB RAM (~900 MB)");
  });

  it("formatModelSelectDescription joins capability and recommendation", () => {
    expect(
      formatModelSelectDescription({
        description: "Balanced offline model.",
        recommendedIf: "Recommended if you have 8 GB RAM.",
        approxSizeMb: 900,
      }),
    ).toContain("Balanced offline model.");
    expect(
      formatModelSelectDescription({
        description: "Balanced offline model.",
        recommendedIf: "Recommended if you have 8 GB RAM.",
        approxSizeMb: 900,
      }),
    ).toContain("Recommended if you have 8 GB RAM.");
  });
});
