import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import type { makeDestinationKeysClearCompleteSegmentsFromX as _makeDestinationKeysClearCompleteSegmentsFromX } from "./makeDestinationKeysClearCompleteSegmentsFromX";
import type { _render } from "./StormwaterStorageSpillTestHelpers";

/** Asserts destination keys clear the complete visible overflow crest. */
export function assertDestinationKeysClearCompleteMarkup({
  markup,
  segments,
}: Readonly<{
  markup: ReturnType<typeof _render>;
  segments: ReturnType<typeof _makeDestinationKeysClearCompleteSegmentsFromX>;
}>): void {
  const keys = [
    ...markup.matchAll(
      /<g data-water-key="physical-[^"]+"[^>]*><circle[^>]*>/g,
    ),
  ].map(([attributes]) => {
    return attributes;
  });
  keys.forEach((key) => {
    return segments.forEach((segment) => {
      const cx = SvgAttributes.getNumberFromMarkup({
          attributes: key,
          name: "cx",
        }),
        cy = SvgAttributes.getNumberFromMarkup({ attributes: key, name: "cy" });
      assert.ok(
        cx + 8 <= segment.left ||
          cx - 8 >= segment.right ||
          cy + 8 <= segment.top ||
          cy - 8 >= segment.bottom,
        "a destination key covers the overflow crest",
      );
    });
  });
}
