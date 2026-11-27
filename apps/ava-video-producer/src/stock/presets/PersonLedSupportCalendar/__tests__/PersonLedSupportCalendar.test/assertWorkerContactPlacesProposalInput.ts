import { PersonLedSupportCalendarTestState } from "./PersonLedSupportCalendarTestState";

const { render: _render, booking: _booking } =
  PersonLedSupportCalendarTestState;

import assert from "node:assert/strict";
import { propEq } from "@avandar/utils";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import type {
  DEFAULT_INPUT,
  fixtures,
  changedInput,
} from "../../PersonLedSupportCalendar.fixtures";

/**
 * Asserts worker contact places the proposal; participant contact carries it
 * to the agreed cell.
 */
export function assertWorkerContactPlacesProposalInput(
  input: Readonly<
    | typeof DEFAULT_INPUT
    | NonNullable<typeof fixtures>[number]["input"]
    | typeof changedInput
  >,
): void {
  return Array.from({ length: 193 }, (_, index) => {
    return 52 + index * 0.25;
  }).forEach((frame) => {
    const markup = _render({ frame: frame, input: input }),
      support = input.commitments.find(propEq("kind", "support"))!;
    const booking = _booking({ markup, id: support.id }),
      hand = SvgAttributes.fromMarker({ markup, marker: "participant-hand" });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: booking, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: booking,
          name: "width",
        }) /
          2,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: booking, name: "y" }),
    );
  });
}
