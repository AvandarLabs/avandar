import { describe, expect, it } from "vitest";
import { getWorkspaceSlugFormatProblem } from "@/components/forms/getWorkspaceSlugFormatProblem/getWorkspaceSlugFormatProblem";

describe("getWorkspaceSlugFormatProblem", () => {
  it("reports the first format problem a slug breaks", () => {
    expect(getWorkspaceSlugFormatProblem("")).toBe("empty");
    expect(getWorkspaceSlugFormatProblem("ab")).toBe("too_short");
    expect(getWorkspaceSlugFormatProblem("a".repeat(21))).toBe("too_long");
    expect(getWorkspaceSlugFormatProblem("nyc measles")).toBe(
      "invalid_characters",
    );
    expect(getWorkspaceSlugFormatProblem("nyc_measles")).toBe(
      "invalid_characters",
    );
  });

  it("accepts letters, numbers, and hyphens up to the maximum length", () => {
    expect(getWorkspaceSlugFormatProblem("a".repeat(20))).toBeUndefined();
    expect(getWorkspaceSlugFormatProblem("nyc-measles")).toBeUndefined();
  });
});
