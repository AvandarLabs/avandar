import {
  ResumableByteTransferTestState,
  type AssertFullRetryCaptionIdentifiesFrameOptions,
} from "./ResumableByteTransferTestState";

const { render: _render } = ResumableByteTransferTestState;
import assert from "node:assert/strict";
import { assertFullRetryCaptionIdentifiesLink as _assertFullRetryCaptionIdentifiesLink } from "./assertFullRetryCaptionIdentifiesLink";
import { assertRetryCaptionPaintBounds as _assertRetryCaptionPaintBounds } from "./assertRetryCaptionPaintBounds";
import { makeFullRetryCaptionIdentifiesCaptionFromCaption as _makeFullRetryCaptionIdentifiesCaptionFromCaption } from "./makeFullRetryCaptionIdentifiesCaptionFromCaption";

/**
 * Asserts the full retry caption identifies every exact checkpoint with
 * offsets shown or hidden.
 */
export function assertFullRetryCaptionIdentifiesFrame({
  frame,
  input,
  acknowledgedBytes,
  file,
}: Readonly<AssertFullRetryCaptionIdentifiesFrameOptions>): void {
  const markup = _render({ frame: frame, input: input });
  const caption = [...markup.matchAll(/<text[^>]+>/g)]
    .map(([tag]) => {
      return tag;
    })
    .find((tag) => {
      return tag.includes(`aria-label="${input.labels.retry}"`);
    });
  assert.ok(caption);
  const { x, fontSize, right } =
    _makeFullRetryCaptionIdentifiesCaptionFromCaption({ caption, input });
  _assertRetryCaptionPaintBounds({ markup, caption, x });
  const checkpoint = 84 + (acknowledgedBytes / file.sizeBytes) * 792;
  const link = [...markup.matchAll(/<path[^>]+>/g)]
    .map(([tag]) => {
      return tag;
    })
    .find((tag) => {
      return tag.includes("data-retry-caption-link=");
    });
  if (!link) {
    assert.ok(
      checkpoint >= x && checkpoint <= right,
      `retry caption has no association with byte ${acknowledgedBytes}`,
    );
    return;
  }
  _assertFullRetryCaptionIdentifiesLink({
    link,
    x,
    checkpoint,
    caption,
    fontSize,
  });
}
