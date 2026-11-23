import { assertUnfoldingConnectorsContactVisibleIssueMarks as _assertUnfoldingConnectorsContactVisibleIssueMarks } from "./assertUnfoldingConnectorsContactVisibleIssueMarks";
import type { fixtures } from "../ReleaseRepairObligations.fixtures";

/**
 * Asserts unfolding connectors contact the visible mark boundary before
 * routing outside the artifact.
 */
export function assertUnfoldingConnectorsContactVisibleInput(
  input:
    | NonNullable<typeof fixtures>[number]["input"]
    | (Omit<NonNullable<typeof fixtures>[number]["input"], "issues"> & {
        issues: Array<
          Omit<
            NonNullable<typeof fixtures>[number]["input"]["issues"][number],
            "state"
          > & {
            state:
              | "resolved"
              | NonNullable<
                  typeof fixtures
                >[number]["input"]["issues"][number]["state"];
          }
        >;
      }),
): void {
  ["tabs", "margin-notches"].forEach((issueMarks) => {
    return _assertUnfoldingConnectorsContactVisibleIssueMarks({
      issueMarks,
      input,
    });
  });
}
