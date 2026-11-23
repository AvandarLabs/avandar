import { PocketInferenceTestState } from "./PocketInferenceTestState";

const { render: _render } = PocketInferenceTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../PocketInference.fixtures";
import { assertSocketIsVisiblyEmptyAxis as _assertSocketIsVisiblyEmptyAxis } from "./assertSocketIsVisiblyEmptyAxis";
import { assertSocketIsVisiblyEmptyFrame as _assertSocketIsVisiblyEmptyFrame } from "./assertSocketIsVisiblyEmptyFrame";

/**
 * Asserts the socket is visibly empty before the cartridge appears and seats
 * before input begins.
 */
export function assertSocketIsVisiblyEmptyShowCutaway(
  showCutaway: boolean,
): void {
  [0, 18, 20].forEach((frame) => {
    return _assertSocketIsVisiblyEmptyFrame({ frame, showCutaway });
  });
  const markup = _render({
    frame: 36,
    input: { ...DEFAULT_INPUT, showCutaway },
  });
  const installation = markup.match(
    /<g[^>]*data-cartridge-installation="local"[^>]*>/,
  )?.[0];
  const socket = markup.match(/<rect[^>]*data-model-socket=[^>]*>/)?.[0];
  const cartridge = markup.match(/<rect[^>]*data-model-cartridge=[^>]*>/)?.[0];
  assert.ok(installation);
  assert.ok(socket);
  assert.ok(cartridge);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: installation,
      name: "opacity",
    }),
    1,
  );
  ["x", "y"].forEach((axis) => {
    return _assertSocketIsVisiblyEmptyAxis({ axis, cartridge, socket });
  });
}
