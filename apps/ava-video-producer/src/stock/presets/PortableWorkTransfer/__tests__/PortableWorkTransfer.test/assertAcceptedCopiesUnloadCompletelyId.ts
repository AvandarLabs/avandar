import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertAcceptedCopiesUnloadCompletelyLeft as _assertAcceptedCopiesUnloadCompletelyLeft } from "./assertAcceptedCopiesUnloadCompletelyLeft";
import { type AssertAcceptedCopiesUnloadCompletelyIdOptions } from "./PortableWorkTransferTestState";

/**
 * Asserts accepted copies unload completely outside the folio onto the
 * destination surface.
 */
export function assertAcceptedCopiesUnloadCompletelyId({
  id,
  markup,
  folioLeft,
  folioRight,
  benchBounds,
}: Readonly<AssertAcceptedCopiesUnloadCompletelyIdOptions>): void {
  const copy = markup.match(
    new RegExp(`<g data-transfer-copy="${id}">([\\s\\S]*?)<\\/g>`),
  )?.[1];
  assert.ok(copy);
  const body = SvgAttributes.fromMarker({
    markup: copy,
    marker: "artifact-body",
  });
  const left = SvgAttributes.getNumberFromMarkup({
    attributes: body,
    name: "x",
  });
  _assertAcceptedCopiesUnloadCompletelyLeft({
    left,
    body,
    folioLeft,
    folioRight,
    id,
    benchBounds,
    markup,
  });
}
