import { DEFAULT_INPUT, fixtures } from "../../ResidentBudgetBallots.fixtures";
import { assertCastPapersRiseThroughBallot as _assertCastPapersRiseThroughBallot } from "./assertCastPapersRiseThroughBallot";

/**
 * Asserts cast papers rise through the open top before traveling toward
 * tally columns.
 */
export function assertCastPapersRiseThroughInput(
  input: Readonly<
    typeof DEFAULT_INPUT | NonNullable<typeof fixtures>[number]["input"]
  >,
): void {
  input.ballots.forEach((ballot, index) => {
    return _assertCastPapersRiseThroughBallot({ ballot, index, input });
  });
}
