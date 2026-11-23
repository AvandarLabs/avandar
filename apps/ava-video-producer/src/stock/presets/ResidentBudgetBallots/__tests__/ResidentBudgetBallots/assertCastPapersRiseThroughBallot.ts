import { ResidentBudgetBallotsTestState } from "./ResidentBudgetBallotsTestState";

const { boxShapes: _boxShapes } = ResidentBudgetBallotsTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../ResidentBudgetBallots.schema";
import { assertCastPapersRiseThroughPaper as _assertCastPapersRiseThroughPaper } from "./assertCastPapersRiseThroughPaper";
import { ResidentBallotTestHelpers } from "./ResidentBallotTestHelpers";

/**
 * Asserts cast papers rise through the open top before traveling toward
 * tally columns.
 */
export function assertCastPapersRiseThroughBallot({
  ballot,
  index,
  input,
}: Readonly<{
  ballot: Readonly<Input["ballots"][number]>;
  index: number;
  input: Readonly<Input>;
}>): void {
  if (ballot.projectId === null) {
    return;
  }
  const waiting = ResidentBallotTestHelpers.render({ frame: 84, input });
  const emerging = ResidentBallotTestHelpers.render({
    frame: 92 + index * 2,
    input,
  });
  const before = ResidentBallotTestHelpers.marker({
    markup: waiting,
    marker: "paper",
    id: ballot.id,
  });
  const paper = ResidentBallotTestHelpers.marker({
    markup: emerging,
    marker: "paper",
    id: ballot.id,
  });
  const body = _boxShapes(emerging)[0];
  const openingY = SvgAttributes.getNumberFromMarkup({
    attributes: body,
    name: "y",
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "y" }) >=
      openingY,
  );
  _assertCastPapersRiseThroughPaper({
    paper,
    openingY,
    before,
    emerging,
  });
}
