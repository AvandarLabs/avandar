import { TradeoffPivotTestState } from "./TradeoffPivotTestState";

const { render: _render, leaf: _leaf } = TradeoffPivotTestState;

import assert from "node:assert/strict";
import type { DEFAULT_INPUT } from "../../TradeoffPivot.fixtures";

/**
 * Asserts reversing reveal order swaps leaf entrances without changing the
 * settled editorial hinge.
 */
export function assertReversingRevealOrderSwapsReversed(
  reversed: Omit<typeof DEFAULT_INPUT, "revealOrder"> & {
    revealOrder: "concession-first";
  },
): void {
  assert.equal(
    _leaf({ markup: _render({ frame: 66 }), side: "concession" })?.[1],
    "0",
  );
  assert.equal(
    _leaf({
      markup: _render({ frame: 66, input: reversed }),
      side: "gain",
    })?.[1],
    "0",
  );
  assert.equal(
    _leaf({
      markup: _render({ frame: 66, input: reversed }),
      side: "concession",
    })?.[1],
    "1",
  );
  assert.equal(
    _leaf({ markup: _render({ frame: 150 }), side: "gain" })?.[2],
    _leaf({
      markup: _render({ frame: 150, input: reversed }),
      side: "gain",
    })?.[2],
  );
}
