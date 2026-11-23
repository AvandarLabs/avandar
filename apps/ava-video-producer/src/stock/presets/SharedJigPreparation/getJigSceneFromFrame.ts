import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./SharedJigPreparation.schema";

/** Data for getJigSceneFromFrame. */
type GetJigSceneFromFrameResult = {
  centers: number[];
  guideX: number;
  guideY: number;
  formed: number;
  applications: boolean[];
  activeIndex: number;
};

type JigSceneArgs = Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>;

type DurationOptions = {
  frame: JigSceneArgs["frame"];
  input: JigSceneArgs["input"];
  motion: JigSceneArgs["motion"];
  centers: number[];
};

type DurationResult = {
  duration: number;
  activeIndex: number;
  guideX: number;
};

/**
 * Samples the jig scene from frame duration state for the current authored
 * frame.
 */
function _getJigSceneFromFrameDurationState({
  frame,
  input,
  motion,
  centers,
}: Readonly<DurationOptions>): DurationResult {
  const duration = 73 / input.collaborators.length;
  const activeIndex = Math.min(
    input.collaborators.length - 1,
    Math.max(0, Math.floor((frame - 49) / duration)),
  );
  const previousX = activeIndex === 0 ? 80 : centers[activeIndex - 1] - 50;
  const arriving = motion.ramp(
    frame,
    49 + activeIndex * duration,
    duration * 0.4,
    motion.travel.easing,
  );
  const travellingX = Motion.mix({
    t: arriving,
    from: previousX,
    to: centers[activeIndex] - 50,
  });
  const guideX =
    frame < 49
      ? 80
      : Motion.mix({
          t: motion.ramp(frame, 122, motion.whip, motion.travel.easing),
          from: travellingX,
          to: 80,
        });
  return { duration, activeIndex, guideX };
}

/** Frame-derived guide position and one application beat per collaborator. */
export function getJigSceneFromFrame({
  frame,
  input,
  motion,
}: JigSceneArgs): GetJigSceneFromFrameResult {
  const centers = input.collaborators.map((_, index) => {
    return input.collaborators.length === 1
      ? 610
      : 350 + (index * 500) / (input.collaborators.length - 1);
  });
  const { duration, activeIndex, guideX } = _getJigSceneFromFrameDurationState({
    frame,
    input,
    motion,
    centers,
  });
  return {
    centers,
    guideX,
    guideY: 350,
    formed: motion.ramp(frame, 20, motion.scale(28), motion.travel.easing),
    applications: centers.map((_, index) => {
      return frame >= 49 + index * duration + duration * 0.65;
    }),
    activeIndex: frame >= 49 && frame < 122 ? activeIndex : -1,
  };
}
