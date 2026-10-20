import { retimeCameraTrack } from "../motion-components/cameraTrack";
import { getContinuityTimeline } from "./continuityTimeline";
import type { MotionOptions } from "../motion-components/motionSettings";
import type { Storyboard } from "../storyboard/schema/schema";
import type { ContinuityBeat } from "./continuitySchema";

type Shot = Extract<Storyboard["shots"][number], { scene: "continuity" }>;

/** Apply a camera profile while retaining reading holds and beat-relative cues. */
export function createContinuityShotFromCameraPreset(
  shot: Shot,
  preset: NonNullable<MotionOptions["preset"]>,
): Shot {
  const beats = shot.props.beats.map((beat) => _applyPreset(beat, preset));
  const timeline = getContinuityTimeline(beats);
  return {
    ...shot,
    durationInFrames: timeline[timeline.length - 1].end,
    props: { ...shot.props, beats },
  };
}

function _applyPreset(
  beat: ContinuityBeat,
  preset: NonNullable<MotionOptions["preset"]>,
): ContinuityBeat {
  const content = beat.content;
  if (content.kind !== "stock" || !content.camera?.length) {
    return beat;
  }
  const authored = retimeCameraTrack(content.camera, content.cameraOptions);
  const adjusted = retimeCameraTrack(content.camera, { preset });
  const addedFrames = Math.max(
    0,
    adjusted[adjusted.length - 1].at - authored[authored.length - 1].at,
  );
  return {
    ...beat,
    duration: beat.duration + addedFrames,
    content: { ...content, cameraOptions: { preset } },
  };
}
