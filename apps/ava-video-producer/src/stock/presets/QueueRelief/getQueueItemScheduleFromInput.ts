import { prop } from "@avandar/utils";
import type { Input } from "./QueueRelief.schema";
/** Data for getQueueItemScheduleFromInput. */
type GetQueueItemScheduleResult = {
  slot: { id: string; label: string; initiallyOpen: boolean };
  slotIndex: number;
  start: number;
  enterDuration: number;
  leave: number;
  finish: number;
  waitingIndex: number;
  isInitial: boolean;
};

/** Deterministic first-in order with initial work held until the expansion. */
export function getQueueItemScheduleFromInput({
  input,
  index,
}: Readonly<{ input: Input; index: number }>): GetQueueItemScheduleResult {
  const initialSlots = input.serviceSlots.filter(prop("initiallyOpen"));
  const expandedSlots = [
    ...input.serviceSlots.filter((slot) => !slot.initiallyOpen),
    ...initialSlots,
  ];
  const isInitial = index < initialSlots.length;
  const waitingIndex = index - initialSlots.length;
  const slot = isInitial
    ? initialSlots[index]
    : expandedSlots[waitingIndex % expandedSlots.length];
  const batch = Math.floor(waitingIndex / expandedSlots.length);
  const start = isInitial
    ? 12 + index * 4
    : 90 + batch * 10 + (waitingIndex % expandedSlots.length) * 2;
  return {
    slot,
    slotIndex: input.serviceSlots.indexOf(slot),
    start,
    enterDuration: isInitial ? 12 : 4,
    leave: isInitial ? 90 : start + 8,
    finish: isInitial ? 96 : start + 16,
    waitingIndex: Math.max(0, waitingIndex),
    isInitial,
  };
}
