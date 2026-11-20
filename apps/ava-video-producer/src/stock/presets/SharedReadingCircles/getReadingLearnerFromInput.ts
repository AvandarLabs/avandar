import { mix } from "../../../motion";
import { getReadingGeometryFromInput } from "./getReadingGeometryFromInput";
import { getReadingSeatFromInput } from "./getReadingSeatFromInput";
import { getSideReadingCarrierFromFrame } from "./getSideReadingCarrierFromFrame";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./SharedReadingCircles.schema";
/** Data for getReadingLearnerFromInput. */
type GetReadingLearnerFromInputResult = {
  x: number;
  y: number;
  isCarrying: boolean;
  hasHand: boolean;
  handX: number;
  handY: number;
  seatAngle: number;
  bookId: string;
};

/**
 * Keeps original roster identities on separate authored-group approach routes.
 */
export function getReadingLearnerFromInput({
  input,
  learner,
  frame,
  motion,
}: Readonly<{
  input: Input;
  learner: Input["learners"][number];
  frame: number;
  motion: VideoMotion;
}>): GetReadingLearnerFromInputResult {
  const groupIndex = input.readingGroups.findIndex((group) => {
    return group.learnerIds.includes(learner.id);
  });
  const group = input.readingGroups[groupIndex];
  const memberIndex = group.learnerIds.indexOf(learner.id);
  const isSide = input.startingShelf === "side";
  const { tableX, bookX, bookY } = getReadingGeometryFromInput({
    input,
    frame,
    groupIndex,
    motion,
  });
  const seat = getReadingSeatFromInput({
    frame,
    memberIndex,
    tableX,
    isSide,
    motion,
  });
  const side = getSideReadingCarrierFromFrame({
    frame,
    groupIndex,
    tableX,
    motion,
  });
  const settle = motion.ramp(frame, 94, motion.scale(14), motion.travel.easing);
  const frontY =
    frame < 44
      ? mix(
          motion.ramp(frame, 24, motion.scale(20), motion.travel.easing),
          330,
          210,
        )
      : mix(settle, bookY - 40, 265);
  const x = memberIndex === 0 ? (isSide ? side.x : tableX + 60) : seat.x;
  const y = memberIndex === 0 ? (isSide ? side.y : frontY) : seat.y;
  const isCarrying =
    memberIndex === 0 &&
    (isSide ? side.isCarrying : frame >= 44 && frame <= 94);
  return {
    x,
    y,
    isCarrying,
    hasHand: memberIndex === 0 && (isSide ? side.hasHand : isCarrying),
    handX: mix(isSide ? side.reach : 1, 10, bookX + (isSide ? -22 : 22) - x),
    handY: mix(isSide ? side.reach : 1, -2, bookY - 12 - y),
    seatAngle: Math.atan2(
      330 - (memberIndex < 2 ? 265 : 395),
      (memberIndex % 2 === 0 ? 60 : -60) * (isSide ? 1 : -1),
    ),
    bookId: group.bookId,
  };
}
