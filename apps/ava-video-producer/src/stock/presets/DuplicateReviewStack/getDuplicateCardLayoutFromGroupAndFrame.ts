import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import type { Input } from "./DuplicateReviewStack.schema";
type Options = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  groupIndex: number;
  record: Input["groups"][number]["records"][number];
  index: number;
};
/** Data for getDuplicateCardLayoutFromGroupAndFrame. */
type GetDuplicateCardLayoutResult = {
  x: number;
  y: number;
  width: number;
  height: number;
  isRetained: boolean;
  isFolded: boolean;
};

/**
 * Comparison alignment precedes folding, with no inferred retained identity.
 */
export function getDuplicateCardLayoutFromGroupAndFrame({
  frame,
  input,
  group,
  groupIndex,
  record,
  index,
}: Readonly<Options>): GetDuplicateCardLayoutResult {
  const align = ramp(frame, 42, 28),
    fold = ramp(frame, 70, 30);
  const isRetained = group.retainedId === record.id;
  const isPair = input.finalView === "comparison-pair";
  const alternativeIndex = group.records
    .filter((candidate) => candidate.id !== group.retainedId)
    .findIndex(propEq("id", record.id));
  const stackOffset = isRetained ? 0 : (alternativeIndex + 1) * 28;
  const sourceX = 44 + groupIndex * 456;
  const sourceY = 200 + index * 124;
  const targetX = isPair
    ? 30 + index * 300
    : sourceX + (isRetained ? 0 : (alternativeIndex + 1) * 12);
  const targetY = isPair
    ? 192 + groupIndex * 240
    : group.retainedId === null
      ? sourceY
      : 200 + stackOffset;
  return {
    x: mix(
      fold,
      mix(align, sourceX + index * 8, sourceX),
      isPair || group.retainedId !== null ? targetX : sourceX,
    ),
    y: mix(fold, sourceY, targetY),
    width: mix(isPair ? fold : 0, 400, 296),
    height: 112,
    isRetained,
    isFolded: fold === 1,
  };
}
