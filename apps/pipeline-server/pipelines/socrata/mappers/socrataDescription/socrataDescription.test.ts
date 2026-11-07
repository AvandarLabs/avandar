import socrataDescription from "@pipelines/socrata/mappers/socrataDescription/socrataDescription";
import { describe, expect, it } from "vitest";

describe("socrataDescription", () => {
  it("returns the description as plain text", () => {
    expect(
      socrataDescription({
        resource: { description: 'See <a href="https://x.gov">this</a>.' },
      }),
    ).toBe("See this (https://x.gov).");
  });

  it("returns undefined when the record has no description", () => {
    expect(socrataDescription({})).toBeUndefined();
  });
});
