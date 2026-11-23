import { SchoolTransitionRehearsalTestState } from "./SchoolTransitionRehearsalTestState";

const { render: _render } = SchoolTransitionRehearsalTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../SchoolTransitionRehearsal.schema";

/**
 * Asserts both support choices preserve rehearsal people and stop identity
 * with either optional trace.
 */
export function assertBothSupportChoicesPreserveFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const markup = _render({ frame: frame, input: input });
  const hand = SvgAttributes.fromMarker({ markup, marker: "locker-hand" });
  const handle = SvgAttributes.fromMarker({ markup, marker: "locker-handle" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "x2" }),
    SvgAttributes.getNumberFromMarkup({ attributes: handle, name: "cx" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "y2" }),
    SvgAttributes.getNumberFromMarkup({ attributes: handle, name: "cy" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup, marker: "learner" }),
      name: "cx",
    }),
    390,
  );
}
