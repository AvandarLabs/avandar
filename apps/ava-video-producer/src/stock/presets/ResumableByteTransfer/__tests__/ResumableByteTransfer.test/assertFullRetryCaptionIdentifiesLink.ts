import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertFullRetryCaptionIdentifiesLinkOptions } from "./ResumableByteTransferTestState";

/**
 * Asserts the full retry caption identifies every exact checkpoint with
 * offsets shown or hidden.
 */
export function assertFullRetryCaptionIdentifiesLink({
  link,
  x,
  checkpoint,
  caption,
  fontSize,
}: Readonly<AssertFullRetryCaptionIdentifiesLinkOptions>): void {
  const points = link.match(/d="M([\d.]+) ([\d.]+) H([\d.]+) V([\d.]+)"/);
  assert.ok(points);
  assert.equal(Number(points[1]), x);
  assert.equal(Number(points[3]), checkpoint);
  assert.ok(
    Number(points[2]) >
      SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) +
        fontSize * 0.3 +
        3,
  );
  assert.ok(Number(points[4]) >= 145 && Number(points[4]) < 157);
}
