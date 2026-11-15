import { EASE, mix, ramp } from "../../../motion";
import { getJarOpeningFromFrame } from "./getJarOpeningFromFrame";
import { getSeedBalancesFromInput } from "./getSeedBalancesFromInput";
import type { Input } from "./SavedSeedSeasonReturn.schema";

type Transfer = {
  frame: number;
  start: number;
  fromX: number;
  toX: number;
  duration: number;
};
function _transfer({ frame, start, fromX, toX, duration }: Readonly<Transfer>) {
  const third = duration / 3;
  return {
    x: mix(ramp(frame, start + third, third, EASE.inOut), fromX, toX),
    y:
      385 -
      110 * ramp(frame, start, third, EASE.inOut) +
      110 * ramp(frame, start + 2 * third, third, EASE.inOut),
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
}: Readonly<{ input: Input; frame: number }>): GetSeedSceneFromFrameResult {
  const balances = getSeedBalancesFromInput(input);
  const { sown, current, remaining, scale } = balances;
  const reservePosition = _transfer({
    frame,
    start: 12,
    fromX: 58 + current * scale,
    toX: 288,
    duration: 36,
  });
  const lossPosition = _transfer({
    frame,
    start: 74,
    fromX: 288 + (remaining + sown) * scale,
    toX: 518,
    duration: 26,
  });
  const sownPosition = _transfer({
    frame,
    start: 124,
    fromX: 288 + remaining * scale,
    toX: 738,
    duration: 20,
  });
  return {
    ...balances,
    reservePosition,
    lossPosition,
    sownPosition,
    hasCompletedSowing: frame >= 144,
    lidOpen: getJarOpeningFromFrame({ frame, loss: balances.loss }),
  };
}
