import { PersonLedSupportCalendarTestState } from "./PersonLedSupportCalendarTestState";

const { render: _render, booking: _booking } =
  PersonLedSupportCalendarTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PersonLedSupportCalendar.schema";
import { assertParticipantGripClearsFullSupportText as _assertParticipantGripClearsFullSupportText } from "./assertParticipantGripClearsFullSupportText";

/**
 * Asserts the participant grip clears the full proposal caption and agreed
 * booking label.
 */
export function assertParticipantGripClearsFullFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const markup = _render({ frame: frame, input: input });
  const hand = SvgAttributes.fromMarker({ markup, marker: "participant-hand" });
  const box = _booking({ markup, id: "4" });
  const supportText = markup.match(
    /<g data-booking-label="4">[\s\S]*?(<text[^>]*>[\s\S]*?<\/text>)/,
  )![1];
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: supportText, name: "y" }) -
      12 >
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "r" }),
  );
  if (frame < 100) {
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: supportText,
        name: "y",
      }) -
        12 >
        442,
    );
    const connector = SvgAttributes.fromMarker({
      markup,
      marker: "proposal-label-connector",
    });
    assert.ok(
      connector.includes(
        `M${SvgAttributes.getNumberFromMarkup({ attributes: box, name: "x" }) + SvgAttributes.getNumberFromMarkup({ attributes: box, name: "width" }) / 2} ${SvgAttributes.getNumberFromMarkup({ attributes: box, name: "y" }) + SvgAttributes.getNumberFromMarkup({ attributes: box, name: "height" })}`,
      ),
    );
  } else {
    _assertParticipantGripClearsFullSupportText({ supportText, box });
  }
}
