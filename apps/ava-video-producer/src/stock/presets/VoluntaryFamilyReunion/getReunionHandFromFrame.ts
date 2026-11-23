import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./VoluntaryFamilyReunion.schema";

type ReunionHand = {
  accepting: boolean;
  handX: number;
  handY: number;
};

type AcceptingOptions = {
  index: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["index"];
  frame: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["frame"];
  groupIndex: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["groupIndex"];
  input: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["input"];
  x: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["x"];
  y: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["y"];
  side: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["side"];
  greeting: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["greeting"];
  motion: Readonly<{
    index: number;
    frame: number;
    groupIndex: number;
    input: Input;
    x: number;
    y: number;
    side: number;
    greeting: number;
    motion: VideoMotion;
  }>["motion"];
};

type AcceptingResult = {
  accepting: boolean;
  handX: number;
  handY: number;
};

/**
 * Samples the reunion hand from frame accepting state for the current authored
 * frame.
 */
function _getReunionHandFromFrameAcceptingState({
  index,
  frame,
  groupIndex,
  input,
  x,
  y,
  side,
  greeting,
  motion,
}: Readonly<AcceptingOptions>): AcceptingResult {
  const accepting =
    index === 0 &&
    frame >= 28 + groupIndex * motion.scaleStagger(18) &&
    frame <= 40 + groupIndex * motion.scaleStagger(18);
  const acceptProgress = motion.ramp(
    frame,
    28 + groupIndex * motion.scaleStagger(18),
    motion.whip,
    motion.travel.easing,
  );
  const handX = accepting
    ? Motion.mix({
        t: acceptProgress,
        from: x + 18,
        to: groupIndex === 0 ? 246 : 866,
      })
    : x + side * (input.greeting === "wave" ? 22 : 34) * greeting;
  const handY = accepting
    ? Motion.mix({
        t: acceptProgress,
        from: y - 28,
        to: 282,
      })
    : y - 28 - (input.greeting === "wave" ? 36 : 8) * greeting;
  return { accepting, handX, handY };
}

/** The invitation hand gives way to the authored greeting after acceptance. */
export function getReunionHandFromFrame({
  index,
  frame,
  groupIndex,
  input,
  x,
  y,
  side,
  greeting,
  motion,
}: Readonly<{
  index: number;
  frame: number;
  groupIndex: number;
  input: Input;
  x: number;
  y: number;
  side: number;
  greeting: number;
  motion: VideoMotion;
}>): ReunionHand {
  const { accepting, handX, handY } = _getReunionHandFromFrameAcceptingState({
    index,
    frame,
    groupIndex,
    input,
    x,
    y,
    side,
    greeting,
    motion,
  });
  return { accepting, handX, handY };
}
