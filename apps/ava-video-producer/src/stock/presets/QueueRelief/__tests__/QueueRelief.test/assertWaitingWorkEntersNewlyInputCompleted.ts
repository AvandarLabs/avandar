import { QueueReliefTestState } from "./QueueReliefTestState";

const { render, items: _items } = QueueReliefTestState;

import assert from "node:assert/strict";
import { type Input } from "../../QueueRelief.schema";

/**
 * Asserts waiting work enters newly opened slots in original order and every
 * completion survives.
 */
export function assertWaitingWorkEntersNewlyInputCompleted({
  input,
  waiting,
}: Readonly<{
  input: Readonly<Input>;
  waiting: Readonly<Input["items"]>;
}>): void {
  const completed = _items(render({ frame: 138, input: input }));
  assert.equal(
    completed.filter((rect) => {
      return rect.includes('data-state="completed"');
    }).length,
    input.items.length,
  );
  input.items.forEach((item) => {
    return assert.ok(
      completed.some((rect) => {
        return rect.includes(`data-item-id="${item.id}"`);
      }),
    );
  });
  const first = _items(render({ frame: 94, input: input })).find((rect) => {
    return rect.includes(`data-item-id="${waiting[0].id}"`);
  })!;
  assert.ok(
    input.serviceSlots.some((slot) => {
      return (
        !slot.initiallyOpen && first.includes(`data-service-slot="${slot.id}"`)
      );
    }),
  );
}
