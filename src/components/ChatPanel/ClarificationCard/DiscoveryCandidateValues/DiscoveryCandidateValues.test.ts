/** Behavioral tests for local prompt-derived discovery candidate matching. */
import { describe, expect, it } from "vitest";
import { DiscoveryCandidateValues } from "./DiscoveryCandidateValues";

describe("DiscoveryCandidateValues", () => {
  it("returns the stored casing for one normalized exact match", () => {
    expect(
      DiscoveryCandidateValues.getUniqueMatch({
        candidateValues: ["california", "CA"],
        discoveredValues: ["Alabama", "California", "Nevada"],
      }),
    ).toBe("California");
  });

  it("normalizes Unicode compatibility characters and whitespace", () => {
    expect(
      DiscoveryCandidateValues.getUniqueMatch({
        candidateValues: ["  ＣＡ  "],
        discoveredValues: ["CA"],
      }),
    ).toBe("CA");
  });

  it("does not use fuzzy or substring matching", () => {
    expect(
      DiscoveryCandidateValues.getUniqueMatch({
        candidateValues: ["California"],
        discoveredValues: ["California North", "Southern California"],
      }),
    ).toBeUndefined();
  });

  it("does not choose when multiple stored values match", () => {
    expect(
      DiscoveryCandidateValues.getUniqueMatch({
        candidateValues: ["California", "CA"],
        discoveredValues: ["California", "CA"],
      }),
    ).toBeUndefined();
  });

  it("does not collapse differently stored values into one choice", () => {
    expect(
      DiscoveryCandidateValues.getUniqueMatch({
        candidateValues: ["california"],
        discoveredValues: ["California", "CALIFORNIA"],
      }),
    ).toBeUndefined();
  });

  it("returns one stored value per named group when each group matches exactly one", () => {
    expect(
      DiscoveryCandidateValues.getGroupMatches({
        candidateGroups: [
          ["california", "CA"],
          ["Texas", "TX"],
        ],
        discoveredValues: ["Alabama", "California", "Texas"],
      }),
    ).toEqual(["California", "Texas"]);
  });

  it("does not choose when a named group matches nothing", () => {
    expect(
      DiscoveryCandidateValues.getGroupMatches({
        candidateGroups: [["California"], ["Narnia"]],
        discoveredValues: ["California", "Texas"],
      }),
    ).toBeUndefined();
  });
});
