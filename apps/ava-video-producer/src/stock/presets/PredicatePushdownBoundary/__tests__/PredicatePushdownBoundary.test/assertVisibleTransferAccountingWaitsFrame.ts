import { PredicatePushdownBoundaryTestState } from "./PredicatePushdownBoundaryTestState";

const { render, accounting: _accounting } = PredicatePushdownBoundaryTestState;
import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { type Input } from "../../PredicatePushdownBoundary.schema";
import { makeVisibleTransferAccountingWaitsExpectedFromInput as _makeVisibleTransferAccountingWaitsExpectedFromInput } from "./makeVisibleTransferAccountingWaitsExpectedFromInput";

/**
 * Asserts visible transfer accounting waits for arrival and distinguishes
 * each denominator.
 */
export function assertVisibleTransferAccountingWaitsFrame({
  frame,
  input,
  numSelected,
}: Readonly<{
  frame: number;
  input: Readonly<Input>;
  numSelected: number;
}>): void {
  if (frame < 139) {
    assert.ok(
      !render({ frame: frame, input: input }).includes(
        `aria-label="${input.labels.transferred}"`,
      ),
    );
  }
  const groups = _accounting(render({ frame: frame, input: input }));
  const expected = _makeVisibleTransferAccountingWaitsExpectedFromInput({
    input,
    frame,
    numSelected,
  });
  assert.deepEqual(
    groups.map(prop("kind")),
    expected.map(prop("kind")),
    `frame ${frame}`,
  );
  groups.forEach((group, index) => {
    assert.ok(group.content.includes(`aria-label="${expected[index].label}"`));
    assert.ok(
      group.content.includes(
        `aria-label="${expected[index].value} ${input.metric.rowUnit}"`,
      ),
    );
  });
  if (frame < 139) {
    assert.ok(
      !render({ frame: frame, input: input }).includes(
        `aria-label="${input.labels.transferred}"`,
      ),
    );
  }
}
