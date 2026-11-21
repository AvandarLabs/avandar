import { SupportRequestResponseTestState } from "./SupportRequestResponseTestState";

const { render } = SupportRequestResponseTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../SupportRequestResponse.fixtures";
import { type Input } from "../../SupportRequestResponse.schema";

/**
 * Asserts only joins brings a second chair and contacting hand to the
 * still-open owner task.
 */
export function assertOnlyJoinsBringsSecondState(state: string): void {
  const input: Input = {
    ...DEFAULT_INPUT,
    showRequestAtHold: false,
    response: {
      state: state as Input["response"]["state"],
      text: `Supplied ${state}`,
    },
  };
  const setup = render({ frame: 30, input: input });
  const hold = render({ frame: 150, input: input });
  assert.doesNotMatch(setup, /data-second-chair=/);
  assert.equal(hold.includes("data-second-chair="), state === "joins");
  assert.ok(hold.includes(`aria-label="${input.response.text}"`));
  assert.ok(hold.includes(`aria-label="${input.people.requester}"`));
  assert.ok(hold.includes(`aria-label="${input.labels.open}"`));
  assert.doesNotMatch(hold, /data-completed=/);
  const task = SvgAttributes.fromMarker({
    markup: hold,
    marker: "unfinished-task",
  });
  assert.ok(task.includes(`data-owner="${input.people.requester}"`));
  if (state === "joins") {
    const hand = SvgAttributes.fromMarker({
      markup: hold,
      marker: "shared-hand",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: task, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: task, name: "width" }),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: task, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: task, name: "height" }),
    );
  }
}
