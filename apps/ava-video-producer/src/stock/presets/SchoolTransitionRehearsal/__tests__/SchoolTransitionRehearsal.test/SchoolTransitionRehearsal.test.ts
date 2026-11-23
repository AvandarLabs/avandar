import { SchoolTransitionRehearsalTestState } from "./SchoolTransitionRehearsalTestState";

const {
  render: _render,
  visible: _visible,
  escape: _escape,
  EXCLUDED_TEXT_FIELDS,
} = SchoolTransitionRehearsalTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { schoolTransitionRehearsalContract as contract } from "../../SchoolTransitionRehearsal.contract";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "../../SchoolTransitionRehearsal.fixtures";
import { inputSchema } from "../../SchoolTransitionRehearsal.schema";
import { assertBothSupportChoicesPreserveFinalStepSupport as _assertBothSupportChoicesPreserveFinalStepSupport } from "./assertBothSupportChoicesPreserveFinalStepSupport";
import { assertLearnerOpensLockerBeforeLocker as _assertLearnerOpensLockerBeforeLocker } from "./assertLearnerOpensLockerBeforeLocker";

test("learner opens the locker before approaching the classroom with chosen support", () => {
  const setup = _render({ frame: 20 });
  const locker = _render({ frame: 65 });
  const hold = _render({ frame: 150 });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: setup,
        marker: "learner",
      }),
      name: "cx",
    }),
    200,
  );
  _assertLearnerOpensLockerBeforeLocker({ locker, hold });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "companion",
      }),
      name: "cx",
    }),
    510,
  );
  assert.match(hold, /aria-label="Practice visit"/);
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) => {
    return _visible({ input: input, frame: frame }).map(_escape);
  },
  textFrames: [24, 72, 150],
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("both support choices preserve rehearsal people and stop identity with either optional trace", () => {
  (["alongside", "stands-back"] as const).forEach((finalStepSupport) => {
    return _assertBothSupportChoicesPreserveFinalStepSupport(finalStepSupport);
  });
});
