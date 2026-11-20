import { matchLiteral } from "@avandar/utils";
import { match, P } from "ts-pattern";
import cursorTargets from "../../../src/avandar/cursor-targets.json";
import { getContinuityTimeline } from "../../../src/continuity/continuityTimeline";
import { MotionSettings } from "../../../src/motion-components/MotionSettings/MotionSettings";
import {
  absoluteCues,
  timeline,
  durationInFrames,
  type Storyboard,
} from "../../../src/storyboard/schema/schema";

/** One timeline shot, with its absolute start frame. */
type TimelineShot = ReturnType<typeof timeline>[number];

/** Mid-motion frames of a scene's build, flight, or window entrance. */
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

/** Offsets around each continuity beat's start, overlap, and scene beats. */
function _getContinuityOffsets(shot: Readonly<TimelineShot>): number[] {
  if (shot.scene !== "continuity") {
    return [];
  }
  const positions = getContinuityTimeline(shot.props.beats);
  return shot.props.beats.flatMap((beat, index) => {
    const start = positions[index].start;
    const overlap = MotionSettings.getMotionDuration({
      frames: beat.transition.frames,
      options: beat.transition.motion,
    });
    const offsets = [
      -1,
      0,
      Math.floor(overlap / 2),
      overlap,
      Math.min(180, beat.duration - 1),
      beat.duration - 1,
    ].map((offset) => {
      return start + offset;
    });
    return beat.content.kind === "composite"
      ? [
          ...offsets,
          start + beat.content.signalAt + 30,
          ...beat.content.diagrams.map((diagram) => {
            return start + diagram.at + 120;
          }),
        ]
      : offsets;
  });
}

/** Offsets just before, at, and after each measured product cursor beat. */
function _getAvandarOffsets(shot: Readonly<TimelineShot>): number[] {
  if (shot.scene !== "avandar") {
    return [];
  }
  const { feature, mode, fromFrame } = shot.props;
  const modeOffset = matchLiteral(mode, {
    full: 0,
    filter: 0,
    query: 290,
    chart: 570,
  });
  return cursorTargets[feature]
    .map((beat) => {
      return beat.frame - modeOffset - fromFrame;
    })
    .filter((beatFrame) => {
      return beatFrame >= 0 && beatFrame < shot.durationInFrames;
    })
    .flatMap((beatFrame) => {
      return [-1, 8, 24].map((shift) => {
        return beatFrame + shift;
      });
    });
}

/**
 * Offsets for the moments graph, flowchart, metric, and media shots
 * animate.
 */
function _getSceneMomentOffsets(shot: Readonly<TimelineShot>): number[] {
  return match(shot)
    .with({ scene: "graph" }, (graphShot) => {
      return (graphShot.props.traversal ?? []).map((traversalStep) => {
        return traversalStep.atFrame + 12;
      });
    })
    .with({ scene: "flowchart" }, (flowchartShot) => {
      return (flowchartShot.props.stepAtFrames ?? []).map((stepFrame) => {
        return stepFrame + 12;
      });
    })
    .with({ scene: "metric" }, (metricShot) => {
      return [
        (metricShot.props.countAtFrame ?? 0) +
          (metricShot.props.countDurationInFrames ?? 36),
      ];
    })
    .with({ scene: "media" }, (mediaShot) => {
      return (mediaShot.props.callouts ?? []).flatMap((callout) => {
        return [callout.startFrame + 1, callout.endFrame - 1];
      });
    })
    .with(
      {
        scene: P.union(
          "continuity",
          "avandar",
          "title",
          "typography",
          "tilted-window",
          "brand-lockup",
          "bar-comparison",
          "stock",
        ),
      },
      () => {
        return [];
      },
    )
    .exhaustive();
}

/** Every local offset worth previewing in one shot. */
function _getShotSampleOffsets(shot: Readonly<TimelineShot>): number[] {
  return [
    0,
    1,
    Math.floor(shot.transitionInFrames / 2),
    shot.transitionInFrames,
    22,
    Math.floor(shot.durationInFrames * 0.65),
    shot.durationInFrames - 1,
    ..._getContinuityOffsets(shot),
    ..._getAvandarOffsets(shot),
    ..._getSceneMomentOffsets(shot),
    ..._sceneBeatFrames(shot),
  ];
}

/**
 * Returns sorted, deduplicated complete-film frame numbers to sample for
 * previewing transitions, narration cues, and scene-specific beats. Called by
 * `renderPreviewStills`, showcase `renderFilm`, and `parityTargets`.
 */
export function getPreviewFramesFromPlan(plan: Readonly<Storyboard>): number[] {
  const totalFrames = durationInFrames(plan);
  const frames = timeline(plan).flatMap((shot) => {
    return [
      shot.startFrame - 1,
      // Offsets stay inside the shot, so a late beat samples its last frame.
      ..._getShotSampleOffsets(shot).map((value) => {
        return (
          shot.startFrame +
          Math.min(shot.durationInFrames - 1, Math.max(0, value))
        );
      }),
    ];
  });
  const cueMiddles = absoluteCues(plan).map((cue) => {
    return Math.floor((cue.startFrame + cue.endFrame) / 2);
  });
  return [
    ...new Set(
      [...frames, ...cueMiddles]
        .filter((value) => {
          return value >= 0 && value < totalFrames;
        })
        .map((value) => {
          return Math.round(value);
        }),
    ),
  ].sort((a, b) => {
    return a - b;
  });
}
