import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";

describe("firstDashboard tutorial", () => {
  it("declares the milestones in the model's order", () => {
    expect(FIRST_DASHBOARD_MILESTONES.map(prop("key"))).toEqual([
      ...NuxProgress.milestoneKeys,
    ]);
  });

  it("gives every milestone at least one tooltip", () => {
    // `nuxActions.completeMilestone` reads `steps.length` to decide whether to
    // advance to a payoff tooltip, so a milestone with no steps would open a
    // tour with nothing in it.
    FIRST_DASHBOARD_MILESTONES.forEach((milestone) => {
      expect(milestone.steps.length).toBeGreaterThan(0);
    });
  });

  it("gives every step resolvable title and body copy", () => {
    FIRST_DASHBOARD_MILESTONES.forEach((milestone) => {
      milestone.steps.forEach((step) => {
        expect(step.title.message).toBeTruthy();
        expect(step.body.message).toBeTruthy();
      });
    });
  });

  it("gives every milestone a distinct completion event", () => {
    const events = FIRST_DASHBOARD_MILESTONES.map(prop("completionEvent"));
    expect(new Set(events).size).toBe(events.length);
  });
});
