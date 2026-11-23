import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertAcceptedCopiesUnloadCompletelyLeftOptions } from "./PortableWorkTransferTestState";

/**
 * Asserts accepted copies unload completely outside the folio onto the
 * destination surface.
 */
export function assertAcceptedCopiesUnloadCompletelyLeft({
  left,
  body,
  folioLeft,
  folioRight,
  id,
  benchBounds,
  markup,
}: Readonly<AssertAcceptedCopiesUnloadCompletelyLeftOptions>): void {
  const right =
    left +
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "width" });
  const bottom =
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "height" });
  assert.ok(
    right + 12 <= folioLeft || left >= folioRight + 12,
    `${id}: copy [${left}, ${right}] still occupies folio [${folioLeft}, ${folioRight}]`,
  );
  assert.ok(left >= Number(benchBounds[1]) && right <= Number(benchBounds[3]));
  assert.ok(bottom <= Number(benchBounds[2]));
  const original = markup.match(
    new RegExp(`<g data-original="${id}">([\\s\\S]*?)<\\/g>`),
  )?.[1];
  assert.ok(original);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: original,
        marker: "artifact-body",
      }),
      name: "x",
    }),
    50,
  );
}
