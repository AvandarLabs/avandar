import assert from "node:assert/strict";
import { assertVisibleTransferAccountingWaitsFrame as _assertVisibleTransferAccountingWaitsFrame } from "./assertVisibleTransferAccountingWaitsFrame";
import { PredicatePushdownBoundaryTestState } from "./PredicatePushdownBoundaryTestState";
import type { DEFAULT_INPUT } from "../../PredicatePushdownBoundary.fixtures";

const {
  render,
  marks: _marks,
  accounting: _accounting,
} = PredicatePushdownBoundaryTestState;

/**
 * Asserts visible transfer accounting waits for arrival and distinguishes
 * each denominator.
 */
export function assertVisibleTransferAccountingWaitsInput(
  input: Readonly<
    | typeof DEFAULT_INPUT
    | (Omit<typeof DEFAULT_INPUT, "predicate"> & {
        predicate: { operator: ">="; threshold: number };
      })
  >,
): void {
  const numSelected = input.rows.filter((row) => {
    return row.value >= input.predicate.threshold;
  }).length;
  [36, 90, 95, 118, 138, 139, 150].forEach((frame) => {
    return _assertVisibleTransferAccountingWaitsFrame({
      frame,
      input,
      numSelected,
    });
  });
  const hidden = render({ frame: 150, input: { ...input, showTotals: false } });
  _accounting(hidden).forEach((group) => {
    return assert.ok(!group.content.includes(input.metric.rowUnit));
  });
  assert.deepEqual(
    _marks({ markup: hidden, name: "transfer-row" }),
    _marks({
      markup: render({ frame: 150, input: input }),
      name: "transfer-row",
    }),
  );
}
