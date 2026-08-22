import { describe, expect, it } from "vitest";
import { getNuxTourStepAfterTransition } from "@/components/Nux/NuxTour/getNuxTourStepAfterTransition/getNuxTourStepAfterTransition";

describe("getNuxTourStepAfterTransition", () => {
  it("closes when Close is clicked on a tooltip that is not last", () => {
    // "Just ask" is step 0 of 2. Treating Close as Next would wait 60s for
    // the canvas tooltip, which is the gray overlay and center loader.
    expect(
      getNuxTourStepAfterTransition({
        action: "close",
        currentIndex: 0,
        stepCount: 2,
      }),
    ).toEqual({ kind: "close" });
  });

  it("closes when Close is clicked on the last tooltip", () => {
    expect(
      getNuxTourStepAfterTransition({
        action: "close",
        currentIndex: 1,
        stepCount: 2,
      }),
    ).toEqual({ kind: "close" });
  });

  it("closes when Skip is clicked on a tooltip that is not last", () => {
    expect(
      getNuxTourStepAfterTransition({
        action: "skip",
        currentIndex: 0,
        stepCount: 2,
      }),
    ).toEqual({ kind: "close" });
  });

  it("advances on Next", () => {
    expect(
      getNuxTourStepAfterTransition({
        action: "next",
        currentIndex: 0,
        stepCount: 2,
      }),
    ).toEqual({ kind: "goToStep", index: 1 });
  });

  it("closes on Next from the last tooltip", () => {
    expect(
      getNuxTourStepAfterTransition({
        action: "next",
        currentIndex: 1,
        stepCount: 2,
      }),
    ).toEqual({ kind: "close" });
  });

  it("goes back on Back", () => {
    expect(
      getNuxTourStepAfterTransition({
        action: "prev",
        currentIndex: 1,
        stepCount: 2,
      }),
    ).toEqual({ kind: "goToStep", index: 0 });
  });
});
