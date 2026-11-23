import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./OrderedLockAcquisition.schema";
/** Frames a key takes to travel between its tray and an operation. */
const KEY_TRAVEL_FRAMES = 4;
/**
 * Exclusive key positions and ownership derived from one authored turn order.
 */
export function getLockStateFromFrame({
  frame,
  input,
  resourceIndex,
  motion,
}: Readonly<LockStateOptions>): LockState {
  const firstIndex = input.operations.findIndex(
    propEq("id", input.firstOperationId),
  );
  const firstY = 235 + firstIndex * 200,
    secondY = 235 + (1 - firstIndex) * 200;
  const firstAcquire = 92 + resourceIndex * 6,
    firstRelease = 112 + resourceIndex * 4;
  const secondAcquire = 124 + resourceIndex * 6,
    secondRelease = 145 + resourceIndex * 5;
  const keyTravel = motion.scale(KEY_TRAVEL_FRAMES);
  const move = (at: number) => {
    return Motion.ramp({
      frame,
      at,
      dur: keyTravel,
      easing: motion.travel.easing,
    });
  };
  const firstTravel = move(firstAcquire) * (1 - move(firstRelease));
  const secondTravel = move(secondAcquire) * (1 - move(secondRelease));
  // An operation owns a key until the key is back in its tray.
  const owner =
    frame >= firstAcquire && frame < firstRelease + keyTravel
      ? input.firstOperationId
      : frame >= secondAcquire && frame < secondRelease + keyTravel
        ? input.operations[1 - firstIndex].id
        : "";
  return {
    x: 560 + resourceIndex * 260,
    y:
      Motion.mix({
        t: firstTravel,
        from: 100,
        to: firstY,
      }) +
      secondTravel * (secondY - 100),
    owner,
  };
}

/** Inputs for one key's authored acquisition sequence. */
type LockStateOptions = {
  frame: number;
  input: Input;
  resourceIndex: number;
  motion: VideoMotion;
};
/** A key's position and the operation that currently owns it. */
type LockState = { x: number; y: number; owner: string };
