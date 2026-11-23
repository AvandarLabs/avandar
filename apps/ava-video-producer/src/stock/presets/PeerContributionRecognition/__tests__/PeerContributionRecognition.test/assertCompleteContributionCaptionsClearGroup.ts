import { PeerContributionRecognitionTestState } from "./PeerContributionRecognitionTestState";

const { markedShape: _markedShape, render } =
  PeerContributionRecognitionTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts complete contribution captions clear both acknowledgment
 * containers and their objects.
 */
export function assertCompleteContributionCaptionsClearGroup({
  group,
  bottom,
  markup,
}: Readonly<{
  group: RegExpExecArray[1];
  bottom: number;
  markup: ReturnType<typeof render>;
}>): void {
  const text = group.match(/<text([^>]*)>([\s\S]*?)<\/text>/);
  assert.ok(text);
  const baseline = SvgAttributes.getNumberFromMarkup({
    attributes: text[1],
    name: "y",
  });
  const fontSize = SvgAttributes.getNumberFromMarkup({
    attributes: text[1],
    name: "font-size",
  });
  const lineOffset = [...text[2].matchAll(/<tspan([^>]*)>/g)].reduce(
    (offset, [, spanAttributes]) => {
      return offset + Number(spanAttributes.match(/ dy="([^"]*)"/)?.[1] ?? 0);
    },
    0,
  );
  assert.ok(
    baseline - fontSize > bottom,
    `${baseline - fontSize} <= acknowledgment bottom ${bottom}`,
  );
  const object = _markedShape({ markup, marker: "focused-object" });
  assert.ok(
    baseline + lineOffset + fontSize * 0.3 <
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "y" }) - 1,
  );
}
