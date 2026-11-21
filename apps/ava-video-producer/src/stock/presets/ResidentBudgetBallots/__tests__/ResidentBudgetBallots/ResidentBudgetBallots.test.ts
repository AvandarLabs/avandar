import { ResidentBudgetBallotsTestState } from "./ResidentBudgetBallotsTestState";

const {
  EXCLUDED_TEXT_FIELDS,
  visible: _visible,
  escape: _escape,
  assertPrivateMark: _assertPrivateMark,
  assertBoxOpening: _assertBoxOpening,
} = ResidentBudgetBallotsTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { residentBudgetBallotsContract as contract } from "../../ResidentBudgetBallots.contract";
import {
  DEFAULT_INPUT,
  INVALID_INPUTS,
  fixtures,
} from "../../ResidentBudgetBallots.fixtures";
import { inputSchema } from "../../ResidentBudgetBallots.schema";
import { assertCastPapersRiseThroughInput as _assertCastPapersRiseThroughInput } from "./assertCastPapersRiseThroughInput";
import { assertConcentratedPapersPreserveIdentitiesTallyArrangement as _assertConcentratedPapersPreserveIdentitiesTallyArrangement } from "./assertConcentratedPapersPreserveIdentitiesTallyArrangement";
import { ResidentBallotTestHelpers } from "./ResidentBallotTestHelpers";

test("all four ballot identities become two bench one books and one abstention", () => {
  const setup = ResidentBallotTestHelpers.render({ frame: 20 });
  const hold = ResidentBallotTestHelpers.render({ frame: 150 });
  DEFAULT_INPUT.ballots.forEach((ballot) => {
    assert.match(setup, new RegExp(`data-ballot="${ballot.id}"`));
    assert.match(hold, new RegExp(`data-ballot="${ballot.id}"`));
  });
  assert.match(hold, /data-tally="bench"[^>]*data-total="2"/);
  assert.match(hold, /data-tally="books"[^>]*data-total="1"/);
  assert.match(hold, /data-abstentions="1"/);
  assert.doesNotMatch(hold, /data-winner|data-funding/);
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract,
  invalidInputs: INVALID_INPUTS,
  render: ResidentBallotTestHelpers.render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) => {
    return _visible({ input, frame }).map(_escape);
  },
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: ResidentBallotTestHelpers.render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("concentrated papers preserve all identities and disjoint final envelopes", () => {
  (["stacks", "rows"] as const).forEach((tallyArrangement) => {
    return _assertConcentratedPapersPreserveIdentitiesTallyArrangement(
      tallyArrangement,
    );
  });
});

test("a valid empty project ID remains a cast ballot rather than an abstention", () => {
  const hold = ResidentBallotTestHelpers.render({
    frame: 150,
    input: fixtures[1].input,
  });
  assert.match(hold, /data-ballot="" data-choice="cast"/);
  assert.match(hold, /data-tally="" data-total="1"/);
  assert.match(hold, /data-abstentions="1"/);
});

test("residents touch their moving papers before the shared box opens", () => {
  [24, 40, 47, 54].forEach((frame) => {
    const markup = ResidentBallotTestHelpers.render({ frame });
    const paper = SvgAttributes.fromMarker({ markup, marker: "paper" });
    const x = SvgAttributes.getNumberFromMarkup({
        attributes: paper,
        name: "x",
      }),
      y = SvgAttributes.getNumberFromMarkup({ attributes: paper, name: "y" });
    assert.ok(
      SvgAttributes.fromMarker({ markup, marker: "ballot-hand" }).includes(
        `L${x + 14} ${y + 16}`,
      ),
    );
  });
});

test("opaque privacy screens shield the actual mark bounds during marking", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    return input.ballots.forEach((_, index) => {
      return _assertPrivateMark({ input, index });
    });
  });
});

test("the shared box changes opening geometry before the same papers extract", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach(
    _assertBoxOpening,
  );
});

test("cast papers rise through the open top before traveling toward tally columns", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    return _assertCastPapersRiseThroughInput(input);
  });
});
