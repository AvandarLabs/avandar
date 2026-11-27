import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertAcceptedCopiesUnloadCompletelyId as _assertAcceptedCopiesUnloadCompletelyId } from "./assertAcceptedCopiesUnloadCompletelyId";
import { PortableWorkTransferTestState } from "./PortableWorkTransferTestState";
import type { FIXTURES } from "../../PortableWorkTransfer.fixtures";

const { render } = PortableWorkTransferTestState;

/**
 * Asserts accepted copies unload completely outside the folio onto the
 * destination surface.
 */
export function assertAcceptedCopiesUnloadCompletelyFixture(
  fixture: (typeof FIXTURES)[number]["input"],
): void {
  const input = { ...fixture, transferState: "accepted" as const };
  const markup = render({ frame: 150, input });
  const folio = SvgAttributes.fromMarker({ markup, marker: "folio" });
  const folioLeft = SvgAttributes.getNumberFromMarkup({
    attributes: folio,
    name: "x",
  });
  const folioRight =
    folioLeft +
    SvgAttributes.getNumberFromMarkup({ attributes: folio, name: "width" });
  const bench = SvgAttributes.fromMarker({
    markup,
    marker: "destination-bench",
  });
  const benchBounds = bench.match(/d="M([\d.]+) ([\d.]+) H([\d.]+)/);
  assert.ok(benchBounds);
  input.artifacts.forEach(({ id }) => {
    return _assertAcceptedCopiesUnloadCompletelyId({
      id,
      markup,
      folioLeft,
      folioRight,
      benchBounds,
    });
  });
}
