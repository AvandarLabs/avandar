import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
type Box = { x: number; y: number; width: number; height: number };
/** Read actual booking rectangle geometry from emitted markup. */
function _getBookingBoxFromMarkup(markup: string): Box {
  return {
    x: SvgAttributes.getNumberFromMarkup({ attributes: markup, name: "x" }),
    y: SvgAttributes.getNumberFromMarkup({ attributes: markup, name: "y" }),
    width: SvgAttributes.getNumberFromMarkup({
      attributes: markup,
      name: "width",
    }),
    height: SvgAttributes.getNumberFromMarkup({
      attributes: markup,
      name: "height",
    }),
  };
}
function _overlaps({ first, second }: { first: Box; second: Box }): boolean {
  return (
    first.x < second.x + second.width &&
    second.x < first.x + first.width &&
    first.y < second.y + second.height &&
    second.y < first.y + first.height
  );
}
function _getTextBox(markup: string): Box {
  const fontSize = SvgAttributes.getNumberFromMarkup({
    attributes: markup,
    name: "font-size",
  });
  const spans = [
    ...markup.matchAll(/<tspan[^>]*dy="([^"]*)"[^>]*>([^<]*)<\/tspan>/g),
  ];
  return {
    x: SvgAttributes.getNumberFromMarkup({ attributes: markup, name: "x" }),
    y:
      SvgAttributes.getNumberFromMarkup({ attributes: markup, name: "y" }) -
      fontSize,
    width: Math.max(
      ...spans.map((span) =>
        getConservativeWidthFromText({ text: span[2], fontSize }),
      ),
    ),
    height:
      fontSize * 1.3 + spans.reduce((sum, span) => sum + Number(span[1]), 0),
  };
}
/**
 * Detect actual later opaque-booking paint and overlapping commitment labels.
 */
function _assertCommitmentLabelsVisible({
  markup,
  labels,
}: Readonly<{ markup: string; labels: string[] }>): void {
  const texts = labels.map((label) => {
    const matches = [
      ...markup.matchAll(
        new RegExp(`<text aria-label="${label}"[^>]*>[\\s\\S]*?<\\/text>`, "g"),
      ),
    ];
    assert.equal(matches.length, 1, `One complete label for ${label}`);
    return { box: _getTextBox(matches[0][0]), index: matches[0].index!, label };
  });
  const bookings = [...markup.matchAll(/<rect data-booking[^>]*>/g)];
  texts.forEach((text, index) => {
    bookings
      .filter(
        (booking) =>
          booking.index! > text.index && !booking[0].includes('fill="none"'),
      )
      .forEach((booking) => {
        assert.ok(
          !_overlaps({
            first: text.box,
            second: _getBookingBoxFromMarkup(booking[0]),
          }),
          `Opaque booking covers ${text.label}`,
        );
      });
    texts
      .slice(index + 1)
      .forEach((other) =>
        assert.ok(
          !_overlaps({ first: text.box, second: other.box }),
          `${text.label} overlaps ${other.label}`,
        ),
      );
  });
}

/** Related PlannerVisibilityAssertions operations. */
export const PlannerVisibilityAssertions = {
  /** Read actual booking rectangle geometry from emitted markup. */
  getBookingBoxFromMarkup: _getBookingBoxFromMarkup,
  /**
   * Detect actual later opaque-booking paint and overlapping commitment labels.
   */
  assertCommitmentLabelsVisible: _assertCommitmentLabelsVisible,
} satisfies {
  getBookingBoxFromMarkup: typeof _getBookingBoxFromMarkup;
  assertCommitmentLabelsVisible: typeof _assertCommitmentLabelsVisible;
};
