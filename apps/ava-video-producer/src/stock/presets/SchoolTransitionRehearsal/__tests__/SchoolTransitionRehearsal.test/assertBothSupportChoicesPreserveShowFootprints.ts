import { SchoolTransitionRehearsalTestState } from "./SchoolTransitionRehearsalTestState";

const { render: _render } = SchoolTransitionRehearsalTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { defaultInput } from "../../SchoolTransitionRehearsal.fixtures";
import { assertBothSupportChoicesPreserveFrame as _assertBothSupportChoicesPreserveFrame } from "./assertBothSupportChoicesPreserveFrame";

/**
 * Asserts both support choices preserve rehearsal people and stop identity
 * with either optional trace.
 */
export function assertBothSupportChoicesPreserveShowFootprints({
  showFootprints,
  finalStepSupport,
  showPracticeStrip,
}: Readonly<{
  showFootprints: boolean;
  finalStepSupport: "alongside" | "stands-back";
  showPracticeStrip: boolean;
}>): void {
  const input = {
    ...defaultInput,
    finalStepSupport,
    showPracticeStrip,
    showFootprints,
    labels: {
      ...defaultInput.labels,
      choice: "Authored choice, preserved literally".slice(0, 34),
    },
  };
  const hold = _render({ frame: 150, input: input });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "companion",
      }),
      name: "cx",
    }),
    finalStepSupport === "alongside" ? 625 : 510,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup: hold, marker: "learner" }),
      name: "cx",
    }),
    730,
  );
  assert.equal(hold.includes('data-practice-strip=""'), showPracticeStrip);
  assert.ok(hold.includes(`aria-label="${input.labels.choice}"`));
  assert.match(hold, /Practice visit/);
  assert.doesNotMatch(hold, /enrolled|attendance|attended|independent/);
  [54, 58, 62, 65].forEach((frame) => {
    return _assertBothSupportChoicesPreserveFrame({ frame, input });
  });
}
