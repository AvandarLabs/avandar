import type { getVisibleReleaseIssueRowsFromInput } from "../getVisibleReleaseIssueRowsFromInput";
/** Inputs shared by the RepairRegister visuals. */
export type Point = Readonly<{ x: number; y: number }>;
/** Inputs shared by the RepairRegister visuals. */
export type FollowUpIssue = ReturnType<
  typeof getVisibleReleaseIssueRowsFromInput
>[number]["issue"];
/** Inputs shared by the RepairRegister visuals. */
export type RegisterEntryProps = Readonly<{
  issue: FollowUpIssue;
  ordinal: number;
  x: number;
  accent: string;
}>;
