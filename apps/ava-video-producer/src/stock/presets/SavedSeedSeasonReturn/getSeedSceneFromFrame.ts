import { mix } from "../../../motion";
import { getJarOpeningFromFrame } from "./getJarOpeningFromFrame";
import { getSeedBalancesFromInput } from "./getSeedBalancesFromInput";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./SavedSeedSeasonReturn.schema";

type Transfer = {
  frame: number;
  start: number;
  fromX: number;
  toX: number;
  duration: number;
  motion: VideoMotion;
};
function _transfer({
  frame,
  start,
  fromX,
  toX,
  duration,
  motion,
}: Readonly<Transfer>) {
  const third = duration / 3;
  return {
    x: mix(
      motion.ramp(frame, start + third, third, motion.travel.easing),
      fromX,
      toX,
    ),
    y:
      385 -
      110 * motion.ramp(frame, start, third, motion.travel.easing) +
      110 * motion.ramp(frame, start + 2 * third, third, motion.travel.easing),
  };
}
/** Data for getSeedSceneFromFrame. */
type GetSeedSceneFromFrameResult = {
  reservePosition: { x: number; y: number };
  lossPosition: { x: number; y: number };
  sownPosition: { x: number; y: number };
  hasCompletedSowing: boolean;
  lidOpen: number;
  harvest: number;
  reserve: number;
  loss: number;
  sown: number;
  current: number;
  remaining: number;
  scale: number;
};

/**
 * Exact balances drive one common mass scale and opening-first transfer paths.
 */
export function getSeedSceneFromFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>): GetSeedSceneFromFrameResult {
  const balances = getSeedBalancesFromInput(input);
  const { sown, current, remaining, scale } = balances;
  const reservePosition = _transfer({
    frame,
    start: 12,
    fromX: 58 + current * scale,
    toX: 288,
    duration: 36,
    motion,
  });
  const lossPosition = _transfer({
    frame,
    start: 74,
    fromX: 288 + (remaining + sown) * scale,
    toX: 518,
    duration: 26,
    motion,
  });
  const sownPosition = _transfer({
    frame,
    start: 124,
    fromX: 288 + remaining * scale,
    toX: 738,
    duration: 20,
    motion,
  });
  return {
    ...balances,
    reservePosition,
    lossPosition,
    sownPosition,
    hasCompletedSowing: frame >= 144,
    lidOpen: getJarOpeningFromFrame({ frame, loss: balances.loss, motion }),
  };
}
