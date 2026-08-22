import { describe, expect, it } from "vitest";
import { nextNuxJoyrideTargetEpoch } from "@/components/Nux/NuxTour/nextNuxJoyrideTargetEpoch/nextNuxJoyrideTargetEpoch";

describe("nextNuxJoyrideTargetEpoch", () => {
  it("does not remount when the target first appears", () => {
    expect(
      nextNuxJoyrideTargetEpoch({
        previousTarget: null,
        nextTarget: "share",
        epoch: 0,
      }),
    ).toBe(0);
  });

  it("remounts when a laid-out target is replaced", () => {
    expect(
      nextNuxJoyrideTargetEpoch({
        previousTarget: "share-old",
        nextTarget: "share-new",
        epoch: 0,
      }),
    ).toBe(1);
  });

  it("does not remount while the laid-out target is missing", () => {
    expect(
      nextNuxJoyrideTargetEpoch({
        previousTarget: "share",
        nextTarget: null,
        epoch: 2,
      }),
    ).toBe(2);
  });

  it("keeps the epoch when the same target is still laid out", () => {
    expect(
      nextNuxJoyrideTargetEpoch({
        previousTarget: "share",
        nextTarget: "share",
        epoch: 4,
      }),
    ).toBe(4);
  });
});
