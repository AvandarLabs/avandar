import { describe, expect, it } from "vitest";
import { shouldCelebrateFirstDashboardCompletion } from "@/components/Nux/NuxCompletionModal/shouldCelebrateFirstDashboardCompletion/shouldCelebrateFirstDashboardCompletion";

const FINALE_MILESTONES = [
  "add_dataset",
  "run_query",
  "build_dashboard",
] as const;

describe("shouldCelebrateFirstDashboardCompletion", () => {
  it("celebrates the publish that finishes the tutorial", () => {
    expect(
      shouldCelebrateFirstDashboardCompletion({
        completedMilestones: FINALE_MILESTONES,
        eventName: "dashboard.published",
        status: "in_progress",
      }),
    ).toBe(true);
  });

  it("does not celebrate a publish before earlier milestones are done", () => {
    expect(
      shouldCelebrateFirstDashboardCompletion({
        completedMilestones: ["add_dataset", "run_query"],
        eventName: "dashboard.published",
        status: "in_progress",
      }),
    ).toBe(false);
  });

  it("does not celebrate a repeat publish after share_dashboard is already done", () => {
    expect(
      shouldCelebrateFirstDashboardCompletion({
        completedMilestones: [...FINALE_MILESTONES, "share_dashboard"],
        eventName: "dashboard.published",
        status: "in_progress",
      }),
    ).toBe(false);
  });

  it("does not celebrate other outcomes", () => {
    expect(
      shouldCelebrateFirstDashboardCompletion({
        completedMilestones: FINALE_MILESTONES,
        eventName: "dashboard.created",
        status: "in_progress",
      }),
    ).toBe(false);
  });

  it("does not celebrate when the tutorial is dismissed", () => {
    expect(
      shouldCelebrateFirstDashboardCompletion({
        completedMilestones: FINALE_MILESTONES,
        eventName: "dashboard.published",
        status: "dismissed",
      }),
    ).toBe(false);
  });
});
