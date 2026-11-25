import { SharedFoundationTestState } from "./SharedFoundationTestState";

const { render: _render } = SharedFoundationTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../SharedFoundation.fixtures";

/**
 * Asserts two distinct approaches reconnect to one changing common
 * foundation.
 */
export function assertTwoDistinctApproachesReconnectHeld(held: string): void {
  const uncover = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, foundationReveal: "uncover" },
  });
  assert.match(uncover, /data-continuous-foundation=/);
  assert.doesNotMatch(uncover, /data-foundation-left=/);
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({
        frame: 150,
        input: { ...DEFAULT_INPUT, showDistinctTraits: false },
      }),
      marker: "trait-0",
    }),
    /opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: held, marker: "trait-0" }),
    /opacity="1"/,
  );
}
