import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./OrderedLockAcquisition.schema";
/**
 * Exclusive key positions and ownership derived from one authored turn order.
 */
export function getLockStateFromFrame({
  frame,
  input,
  resourceIndex,
}: Readonly<{ frame: number; input: Input; resourceIndex: number }>): {
  x: number;
  y: number;
  owner: string;
} {
  const firstIndex = input.operations.findIndex(
    ({ id }) => id === input.firstOperationId,
  );
  const firstY = 235 + firstIndex * 200,
    secondY = 235 + (1 - firstIndex) * 200;
  const firstAcquire = 92 + resourceIndex * 6,
    firstRelease = 112 + resourceIndex * 4;
  const secondAcquire = 124 + resourceIndex * 6,
    secondRelease = 145 + resourceIndex * 5;
  const firstTravel =
    ramp(frame, firstAcquire, 4, EASE.inOut) *
    (1 - ramp(frame, firstRelease, 4, EASE.inOut));
  const secondTravel =
    ramp(frame, secondAcquire, 4, EASE.inOut) *
    (1 - ramp(frame, secondRelease, 4, EASE.inOut));
  const owner =
    frame >= firstAcquire && frame < firstRelease + 4
      ? input.firstOperationId
      : frame >= secondAcquire && frame < secondRelease + 4
        ? input.operations[1 - firstIndex].id
        : "";
  return {
    x: 560 + resourceIndex * 260,
    y: mix(firstTravel, 100, firstY) + secondTravel * (secondY - 100),
    owner,
  };
}
