/**
 * Types for NUX prerequisite strategies that judge milestone completion.
 */
import type {
  NuxEvent,
  NuxEventName,
} from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

/** Workspace artifact facts used for durable catch-up. */
export type NuxPrerequisiteFacts = {
  hasDataset: boolean;
  hasDashboard: boolean;
  hasPublishedDashboard: boolean;
};

/** Strategy object that decides when a milestone is already complete. */
export type NuxPrerequisite = {
  /** Milestone this strategy evaluates. */
  milestoneKey: NuxProgress.MilestoneKey;
  /** Live event that can complete this milestone when the filter passes. */
  completionEvent?: NuxEventName;
  /**
   * Optional filter on the live event payload. When omitted, any event with
   * `completionEvent` completes the milestone.
   */
  matchesEvent?: (event: NuxEvent) => boolean;
  /**
   * Whether workspace artifacts already prove this milestone done. Catch-up
   * uses this; live completion uses `completionEvent` and `matchesEvent`.
   */
  isSatisfied: (facts: Readonly<NuxPrerequisiteFacts>) => boolean;
};
