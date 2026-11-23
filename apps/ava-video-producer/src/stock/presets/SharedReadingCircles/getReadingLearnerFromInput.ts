import { Motion } from "../../../motion";
import { getReadingGeometryFromInput } from "./getReadingGeometryFromInput";
import { getReadingSeatFromInput } from "./getReadingSeatFromInput";
import { getSideReadingCarrierFromFrame } from "./getSideReadingCarrierFromFrame";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
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

type SideOptions = {
  frame: Readonly<{
    input: Input;
    learner: Input["learners"][number];
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    learner: Input["learners"][number];
    frame: number;
    motion: VideoMotion;
  }>["motion"];
  groupIndex: number;
  memberIndex: number;
  isSide: boolean;
  tableX: ReturnType<typeof getReadingGeometryFromInput>["tableX"];
  bookY: ReturnType<typeof getReadingGeometryFromInput>["bookY"];
};

type SideResult = {
  side: ReturnType<typeof getSideReadingCarrierFromFrame>;
  x:
    | ReturnType<typeof getSideReadingCarrierFromFrame>["x"]
    | number
    | ReturnType<typeof getReadingSeatFromInput>["x"];
  y:
    | ReturnType<typeof getSideReadingCarrierFromFrame>["y"]
    | number
    | ReturnType<typeof getReadingSeatFromInput>["y"];
};

type GroupOptions = {
  input: Readonly<{
    input: Input;
    learner: Input["learners"][number];
    frame: number;
    motion: VideoMotion;
  }>["input"];
  learner: Readonly<{
    input: Input;
    learner: Input["learners"][number];
    frame: number;
    motion: VideoMotion;
  }>["learner"];
  frame: Readonly<{
    input: Input;
    learner: Input["learners"][number];
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    learner: Input["learners"][number];
    frame: number;
    motion: VideoMotion;
  }>["motion"];
  groupIndex: number;
};

type GroupResult = {
  group: Readonly<{
    input: Input;
    learner: Input["learners"][number];
    frame: number;
    motion: VideoMotion;
  }>["input"]["readingGroups"][number];
  memberIndex: number;
  isSide: boolean;
  bookX: ReturnType<typeof getReadingGeometryFromInput>["bookX"];
  bookY: ReturnType<typeof getReadingGeometryFromInput>["bookY"];
  side: SideResult["side"];
  x: SideResult["x"];
  y: SideResult["y"];
  isCarrying: boolean | SideResult["side"]["isCarrying"] | boolean;
};

/**
 * Samples the reading learner from input side state for the current authored
 * frame.
 */
function _getReadingLearnerFromInputSideState({
  frame,
  motion,
  groupIndex,
  memberIndex,
  isSide,
  tableX,
  bookY,
}: Readonly<SideOptions>): SideResult {
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
      ? Motion.mix({
          t: motion.ramp(frame, 24, motion.scale(20), motion.travel.easing),
          from: 330,
          to: 210,
        })
      : Motion.mix({
          t: settle,
          from: bookY - 40,
          to: 265,
        });
  const x = memberIndex === 0 ? (isSide ? side.x : tableX + 60) : seat.x;
  const y = memberIndex === 0 ? (isSide ? side.y : frontY) : seat.y;
  return { side, x, y };
}

/**
 * Samples the reading learner from input group state for the current authored
 * frame.
 */
function _getReadingLearnerFromInputGroupState({
  input,
  learner,
  frame,
  motion,
  groupIndex,
}: Readonly<GroupOptions>): GroupResult {
  const group = input.readingGroups[groupIndex];
  const memberIndex = group.learnerIds.indexOf(learner.id);
  const isSide = input.startingShelf === "side";
  const { tableX, bookX, bookY } = getReadingGeometryFromInput({
    input,
    frame,
    groupIndex,
    motion,
  });
  const { side, x, y } = _getReadingLearnerFromInputSideState({
    frame,
    motion,
    groupIndex,
    memberIndex,
    isSide,
    tableX,
    bookY,
  });
  const isCarrying =
    memberIndex === 0 &&
    (isSide ? side.isCarrying : frame >= 44 && frame <= 94);
  return { group, memberIndex, isSide, bookX, bookY, side, x, y, isCarrying };
}

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
  const { group, memberIndex, isSide, bookX, bookY, side, x, y, isCarrying } =
    _getReadingLearnerFromInputGroupState({
      input,
      learner,
      frame,
      motion,
      groupIndex,
    });
  return {
    x,
    y,
    isCarrying,
    hasHand: memberIndex === 0 && (isSide ? side.hasHand : isCarrying),
    handX: Motion.mix({
      t: isSide ? side.reach : 1,
      from: 10,
      to: bookX + (isSide ? -22 : 22) - x,
    }),
    handY: Motion.mix({
      t: isSide ? side.reach : 1,
      from: -2,
      to: bookY - 12 - y,
    }),
    seatAngle: Math.atan2(
      330 - (memberIndex < 2 ? 265 : 395),
      (memberIndex % 2 === 0 ? 60 : -60) * (isSide ? 1 : -1),
    ),
    bookId: group.bookId,
  };
}
