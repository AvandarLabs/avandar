import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { assertWaitingWorkEntersNewlyInputCompleted as _assertWaitingWorkEntersNewlyInputCompleted } from "./assertWaitingWorkEntersNewlyInputCompleted";
import { QueueReliefTestState } from "./QueueReliefTestState";
import type { fixtures } from "../../QueueRelief.fixtures";

const { render, items: _items } = QueueReliefTestState;

/** Asserts the independently authored rendered test contract. */
export function assertWaitingWorkEntersNewlyInput(
  input: (typeof fixtures)[number]["input"],
): void {
  const initial = input.serviceSlots.filter(prop("initiallyOpen")).length;
  const starts = new Map<string, number>();
  Array.from({ length: 49 }, (_, index) => {
    return 90 + index;
  }).forEach((frame) => {
    const rects = _items(render({ frame: frame, input: input }));
    assert.equal(rects.length, input.items.length);
    rects.forEach((rect) => {
      const id = rect.match(/data-item-id="([^"]*)"/)![1];
      if (rect.includes('data-state="entering"') && !starts.has(id)) {
        starts.set(id, frame);
      }
    });
  });
  const waiting = input.items.slice(initial);
  waiting.forEach((item, index) => {
    assert.ok(starts.has(item.id));
    if (index > 0) {
      assert.ok(starts.get(waiting[index - 1].id)! < starts.get(item.id)!);
    }
  });
  _assertWaitingWorkEntersNewlyInputCompleted({ input, waiting });
}
