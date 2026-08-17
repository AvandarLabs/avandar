import { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants";
import { describe, expect, it } from "vitest";
import { NuxAnchors } from "@/components/Nux/nuxAnchors";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";

describe("firstDashboard tutorial", () => {
  it("declares the milestones in the model's order", () => {
    expect(
      FIRST_DASHBOARD_MILESTONES.map((milestone) => {
        return milestone.key;
      }),
    ).toEqual([...NUX_MILESTONE_KEYS]);
  });

  it("holds ten tooltips in chunks of 3, 2, 2, 3", () => {
    expect(
      FIRST_DASHBOARD_MILESTONES.map((milestone) => {
        return milestone.steps.length;
      }),
    ).toEqual([3, 2, 2, 3]);
  });

  it("only targets anchors the registry knows", () => {
    const known = new Set<string>(Object.values(NuxAnchors));
    FIRST_DASHBOARD_MILESTONES.forEach((milestone) => {
      milestone.steps.forEach((step) => {
        expect(known.has(step.anchor)).toBe(true);
      });
    });
  });

  it("gives every milestone a distinct completion event", () => {
    const events = FIRST_DASHBOARD_MILESTONES.map((milestone) => {
      return milestone.completionEvent;
    });
    expect(new Set(events).size).toBe(events.length);
  });
});
