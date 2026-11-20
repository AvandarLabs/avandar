import cursorTargets from "../../../src/avandar/cursor-targets.json";
import { getContinuityTimeline } from "../../../src/continuity/continuityTimeline";
import { MotionSettings } from "../../../src/motion-components/MotionSettings/MotionSettings";
import {
  absoluteCues,
  timeline,
  durationInFrames,
  type Storyboard,
} from "../../../src/storyboard/schema/schema";
/** Frames inside a shot where its scene's own exit or swap is mid-motion. */
function _sceneBeatFrames(shot: Storyboard["shots"][number]): number[] {
  const exitAt =
    "exit" in shot.props && shot.props.exit && "atFrame" in shot.props.exit
      ? shot.props.exit.atFrame
      : undefined;
  const swaps =
    shot.scene === "tilted-window"
      ? (shot.props.windows ?? []).flatMap((window) => {
          return window.atFrame === undefined ? [] : [window.atFrame + 2];
        })
      : [];
  return [
    ...(exitAt === undefined ? [] : [exitAt + 3]),
    ...swaps,
    ..._signatureBeatFrames(shot),
  ];
}
/** Mid-motion frames of a scene's build, flight or window entrance. */
function _signatureBeatFrames(shot: Storyboard["shots"][number]): number[] {
  if (shot.scene === "brand-lockup") {
    return [
      ...(shot.props.build ? [(shot.props.build.atFrame ?? 5) + 6] : []),
      ...(shot.props.exit ? [shot.props.exit.atFrame + 12] : []),
    ];
  }
  if (shot.scene === "tilted-window" && shot.props.enter) {
    const { enter } = shot.props;
    const at = enter.atFrame ?? 1;
    return enter.kind === "pull-back" ? [at + 9] : [at + 4];
  }
  return [];
}
/**
 * Sample complete-film frames, including dissolves and scene-specific beats.
 */
export function previewFrames(plan: Storyboard): number[] {
  const frames = new Set<number>();
  const add = (value: number) => {
    if (value >= 0 && value < durationInFrames(plan))
      frames.add(Math.round(value));
  };
  for (const shot of timeline(plan)) {
    const local = (value: number) => {
      return add(
        shot.startFrame +
          Math.min(shot.durationInFrames - 1, Math.max(0, value)),
      );
    };
    add(shot.startFrame - 1);
    for (const value of [
      0,
      1,
      Math.floor(shot.transitionInFrames / 2),
      shot.transitionInFrames,
      22,
      Math.floor(shot.durationInFrames * 0.65),
      shot.durationInFrames - 1,
    ])
      local(value);
    if (shot.scene === "continuity") {
      const positions = getContinuityTimeline(shot.props.beats);
      shot.props.beats.forEach((beat, index) => {
        const start = positions[index].start;
        const overlap = MotionSettings.getMotionDuration({
          frames: beat.transition.frames,
          options: beat.transition.motion,
        });
        for (const offset of [
          -1,
          0,
          Math.floor(overlap / 2),
          overlap,
          Math.min(180, beat.duration - 1),
          beat.duration - 1,
        ])
          local(start + offset);
        if (beat.content.kind === "composite") {
          local(start + beat.content.signalAt + 30);
          for (const diagram of beat.content.diagrams)
            local(start + diagram.at + 120);
        }
      });
    }
    if (shot.scene === "avandar") {
      for (const beat of cursorTargets[shot.props.feature] as Array<{
        frame: number;
      }>) {
        const modeOffset =
          shot.props.mode === "query"
            ? 290
            : shot.props.mode === "chart"
              ? 570
              : 0;
        const at = beat.frame - modeOffset - shot.props.fromFrame;
        if (at >= 0 && at < shot.durationInFrames)
          for (const shift of [-1, 8, 24]) local(at + shift);
      }
    }
    if (shot.scene === "graph")
      for (const item of shot.props.traversal ?? []) local(item.atFrame + 12);
    if (shot.scene === "flowchart")
      for (const at of shot.props.stepAtFrames ?? []) local(at + 12);
    if (shot.scene === "metric")
      local(
        (shot.props.countAtFrame ?? 0) +
          (shot.props.countDurationInFrames ?? 36),
      );
    _sceneBeatFrames(shot).forEach(local);
    if (shot.scene === "media")
      for (const item of shot.props.callouts ?? []) {
        local(item.startFrame + 1);
        local(item.endFrame - 1);
      }
  }
  for (const cue of absoluteCues(plan))
    add(Math.floor((cue.startFrame + cue.endFrame) / 2));
  return [...frames].sort((a, b) => {
    return a - b;
  });
}
