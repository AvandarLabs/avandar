import { describe, expect, it } from "vitest";

import { shouldCloseTourOnTargetNotFound } from "@/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound";

describe("shouldCloseTourOnTargetNotFound", () => {
  it("does not close while the document is hidden, even for the current step", () => {
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error:target_not_found",
        eventStepIndex: 1,
        activeStepIndex: 1,
        isDocumentVisible: false,
      }),
    ).toBe(false);
  });

  it("does not close on tour:end or error while the document is hidden", () => {
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "tour:end",
        eventStepIndex: 0,
        activeStepIndex: 0,
        isDocumentVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error",
        eventStepIndex: 0,
        activeStepIndex: 0,
        isDocumentVisible: false,
      }),
    ).toBe(false);
  });

  it("closes when the missing target is the step we are still on", () => {
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error:target_not_found",
        eventStepIndex: 1,
        activeStepIndex: 1,
        isDocumentVisible: true,
      }),
    ).toBe(true);
  });

  it("does not close when the tour already advanced past the missing target", () => {
    // Save unmounts the import form (step 1) in the same tick that
    // completeMilestone jumps to the payoff (step 2). Joyride still emits
    // TARGET_NOT_FOUND for the form; closing would leave the overlay up
    // and never show the payoff.
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error:target_not_found",
        eventStepIndex: 1,
        activeStepIndex: 2,
        isDocumentVisible: true,
      }),
    ).toBe(false);
  });

  it("closes on tour:end and error on a visible page even if the step indices differ", () => {
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "tour:end",
        eventStepIndex: 0,
        activeStepIndex: 2,
        isDocumentVisible: true,
      }),
    ).toBe(true);
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error",
        eventStepIndex: 0,
        activeStepIndex: 2,
        isDocumentVisible: true,
      }),
    ).toBe(true);
  });
});
