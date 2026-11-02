import { describe, expect, it } from "vitest";
import { buildNuxTourFloatingOptions } from "@/components/Nux/NuxTour/buildNuxTourFloatingOptions/buildNuxTourFloatingOptions";

describe("buildNuxTourFloatingOptions", () => {
  it("does not pin flip fallbacks to sides that omit bottom", () => {
    const { flipOptions } = buildNuxTourFloatingOptions();
    const fallbackPlacements =
      flipOptions === false || flipOptions === undefined
        ? undefined
        : flipOptions.fallbackPlacements;
    expect(
      fallbackPlacements === undefined || fallbackPlacements.includes("bottom"),
    ).toBe(true);
  });
});
