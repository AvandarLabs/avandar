import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { assertDestinationKeysClearCompleteMarkup as _assertDestinationKeysClearCompleteMarkup } from "./assertDestinationKeysClearCompleteMarkup";
import { makeDestinationKeysClearCompleteSegmentsFromX as _makeDestinationKeysClearCompleteSegmentsFromX } from "./makeDestinationKeysClearCompleteSegmentsFromX";
import { _render } from "./StormwaterStorageSpillTestHelpers";
import type { fixtures } from "../StormwaterStorageSpill.fixtures";

/** Asserts destination keys clear the complete visible overflow crest. */
export function assertDestinationKeysClearCompleteOverflowSide({
  overflowSide,
  input,
}: Readonly<{
  overflowSide: "left" | "right";
  input: (typeof fixtures)[number]["input"];
}>): void {
  const markup = _render({ frame: 150, input: { ...input, overflowSide } });
  const crest = SvgAttributes.fromMarker({ markup, marker: "crest" });
  if (
    SvgAttributes.getNumberFromMarkup({
      attributes: crest,
      name: "opacity",
    }) === 0
  ) {
    return;
  }
  const path = crest
    .match(/d="M([\d.]+) ([\d.]+)V([\d.]+)H([\d.]+)V400"/)!
    .slice(1)
    .map(Number);
  const [x, startY, topY, outside] = path;
  const segments = _makeDestinationKeysClearCompleteSegmentsFromX({
    x,
    topY,
    startY,
    outside,
  });
  _assertDestinationKeysClearCompleteMarkup({ markup, segments });
}
