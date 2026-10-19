import { parsePipelineRunLimit } from "@pipelines/shared/parsePipelineRunLimit/parsePipelineRunLimit";
import { describe, expect, it } from "vitest";

describe("parsePipelineRunLimit", () => {
  it("returns undefined when no limit is given", () => {
    expect(parsePipelineRunLimit(undefined)).toBe(undefined);
  });

  it("returns a positive integer unchanged", () => {
    expect(parsePipelineRunLimit(5)).toBe(5);
  });

  it("reads a numeric string, as argv passes it", () => {
    expect(parsePipelineRunLimit("12")).toBe(12);
  });

  it.each([0, -1, 1.5, "abc", "", null, Number.NaN])(
    "throws for %j, which is not a positive integer",
    (value) => {
      expect(() => {
        return parsePipelineRunLimit(value);
      }).toThrow(/positive integer/);
    },
  );
});
