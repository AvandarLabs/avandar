import { PocketInferenceTestState } from "./PocketInferenceTestState";

const { render: _render } = PocketInferenceTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../PocketInference.fixtures";

/**
 * Asserts the socket is visibly empty before the cartridge appears and seats
 * before input begins.
 */
export function assertSocketIsVisiblyEmptyFrame({
  frame,
  showCutaway,
}: Readonly<{ frame: number; showCutaway: boolean }>): void {
  const markup = _render({
    frame: frame,
    input: { ...DEFAULT_INPUT, showCutaway },
  });
  const installation = markup.match(
    /<g([^>]*data-cartridge-installation="local"[^>]*)>(.*?)<\/g>/,
  );
  const paintingOpacity = installation
    ? SvgAttributes.getNumberFromMarkup({
        attributes: installation[1],
        name: "opacity",
      })
    : 1;
  assert.match(installation?.[2] ?? markup, /data-model-cartridge="resident"/);
  assert.ok(
    (installation?.[2] ?? markup).includes(
      `aria-label="${DEFAULT_INPUT.model.label}"`,
    ),
  );
  assert.equal(
    paintingOpacity,
    0,
    `cartridge paints the setup at frame ${frame}`,
  );
  assert.match(markup, /data-model-socket=/);
}
