import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";

type Point = { x: number; y: number };
type Hand = Point & { action?: "reservation" | "loss" | "furrow" | "sowing" };
type Travel = {
  frame: number;
  at: number;
  duration: number;
  from: Point;
  to: Point;
  motion: VideoMotion;
};
function _travel({
  frame,
  at,
  duration,
  from,
  to,
  motion,
}: Readonly<Travel>): Point {
  const progress = motion.ramp(frame, at, duration, motion.travel.easing);
  return { x: mix(progress, from.x, to.x), y: mix(progress, from.y, to.y) };
}
type SowingHandArgs = Readonly<{
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
  lossEnd: Point;
  motion: VideoMotion;
}>;

/** The hand drawing the furrow across the plot. */
function _getFurrowHand(frame: number, motion: VideoMotion): Hand {
  return {
    x: 738 + 180 * motion.ramp(frame, 108, motion.whip, motion.entrance.easing),
    y: 399,
    action: "furrow",
  };
}

function _getSowingHand({
  scene,
  frame,
  lossEnd,
  motion,
}: SowingHandArgs): Hand {
  const { sown, remaining, scale } = scene;
  if (sown === 0) {
    return lossEnd;
  }
  if (frame < 108) {
    return _travel({
      frame,
      at: 100,
      duration: 8,
      from: lossEnd,
      to: { x: 738, y: 399 },
      motion,
    });
  }
  if (frame <= 116) {
    return _getFurrowHand(frame, motion);
  }
  if (frame < 124) {
    return _travel({
      frame,
      at: 116,
      duration: 8,
      from: { x: 918, y: 399 },
      to: { x: 288 + (remaining + sown / 2) * scale, y: 385 },
      motion,
    });
  }
  return {
    x: scene.sownPosition.x + (sown * scale) / 2,
    y: scene.sownPosition.y,
    action: frame <= 144 ? "sowing" : undefined,
  };
}
/**
 * Continuous empty-hand travel connects contact with each real material band.
 */
export function getCultivatorHandFromFrame({
  scene,
  frame,
  motion,
}: Readonly<{
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
  motion: VideoMotion;
}>): Hand {
  const { reserve, loss, sown, remaining, scale } = scene;
  if (reserve === 0) {
    return { x: 280, y: 330 };
  }
  const reserveEnd = { x: 288 + (reserve * scale) / 2, y: 385 };
  const reserveHand = {
    ...scene.reservePosition,
    x: scene.reservePosition.x + (reserve * scale) / 2,
  };
  const lossStart = { x: 288 + (remaining + sown + loss / 2) * scale, y: 385 };
  const lossEnd =
    loss > 0 ? { x: 518 + (loss * scale) / 2, y: 385 } : reserveEnd;
  if (frame < 12) {
    return _travel({
      frame,
      at: 0,
      duration: 12,
      from: { x: 280, y: 330 },
      to: reserveHand,
      motion,
    });
  }
  if (frame <= 48) {
    return { ...reserveHand, action: "reservation" };
  }
  if (frame < 74) {
    return _travel({
      frame,
      at: 68,
      duration: 6,
      from: reserveEnd,
      to: loss > 0 ? lossStart : reserveEnd,
      motion,
    });
  }
  if (frame <= 100 && loss > 0) {
    return {
      x: scene.lossPosition.x + (loss * scale) / 2,
      y: scene.lossPosition.y,
      action: "loss",
    };
  }
  return _getSowingHand({ scene, frame, lossEnd, motion });
}
