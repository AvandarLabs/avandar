/* eslint-disable @typescript-eslint/no-namespace */
import {
  FIRST_DASHBOARD_TUTORIAL_KEY,
  NUX_MILESTONE_KEYS,
  NUX_STATUSES,
} from "$/models/NuxProgress/NuxProgress.constants.ts";
import type {
  NuxMilestoneKey,
  NuxProgressId,
  NuxProgressRead,
  NuxStatus,
  NuxTutorialKey,
} from "$/models/NuxProgress/NuxProgress.types.ts";

/** A user's progress through one onboarding tutorial. */
export namespace NuxProgress {
  export type T = NuxProgressRead;
  export type Id = NuxProgressId;
  export type Status = NuxStatus;
  export type MilestoneKey = NuxMilestoneKey;
  export type TutorialKey = NuxTutorialKey;

  /** Every milestone key, in the order a user walks them. */
  export const milestoneKeys = NUX_MILESTONE_KEYS;

  /** Every value of the `nux_status` database enum. */
  export const statuses = NUX_STATUSES;

  /** The only tutorial key that ships today. */
  export const firstDashboardTutorialKey = FIRST_DASHBOARD_TUTORIAL_KEY;

  /**
   * Whether an arbitrary string is a milestone key this build knows.
   *
   * Lives here so callers narrowing values read out of the database do not each
   * rebuild their own lookup from `milestoneKeys`.
   */
  export function isMilestoneKey(value: string): value is NuxMilestoneKey {
    return (NUX_MILESTONE_KEYS as readonly string[]).includes(value);
  }
}
