import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./EntitySpineAssembly.schema";

type Params = {
  input: Input;
  observation: Input["observations"][number];
  index: number;
  frame: number;
  motion: VideoMotion;
};
/** Data for getSpineContributionFromFrame. */
type GetSpineContributionFromFrameResult = {
  x: number;
  y: number;
  opacity: number;
  groupStart: number;
  entityIndex: number;
  sum: number;
};

/** Measures the preceding entity stacks with the authored row spacing. */
function _getSpineGroupStartFromInput({
  input,
  entityIndex,
}: Readonly<GetSpineGroupStartFromInputOptions>): number {
  return (
    112 +
    input.entities.slice(0, entityIndex).reduce((height, entity) => {
      const numEntityObservations = input.observations.filter(
        propEq("entityId", entity.id),
      ).length;
      return (
        height + (numEntityObservations ? numEntityObservations * 20 + 34 : 0)
      );
    }, 0)
  );
}

/** Foreground numeric contribution position through stacking and collapse. */
export function getSpineContributionFromFrame({
  input,
  observation,
  index,
  frame,
  motion,
}: Readonly<Params>): GetSpineContributionFromFrameResult {
  const entityIndex = input.entities.findIndex(
    propEq("id", observation.entityId),
  );
  const groupStart = _getSpineGroupStartFromInput({ input, entityIndex });
  const entityRows = input.observations.filter(({ entityId }) => {
    return entityId === observation.entityId;
  });
  const pose = _getContributionPoseFromRowsAndFrame({
    entityRows,
    observation,
    groupStart,
    index,
    frame,
    motion,
  });
  return {
    ...pose,
    opacity:
      1 -
      Motion.ramp({ frame, at: 96, dur: 105 - 96, easing: motion.exit.easing }),
    groupStart,
    entityIndex,
    sum: entityRows.reduce((total, { value }) => {
      return total + value;
    }, 0),
  };
}

type GetSpineGroupStartFromInputOptions = {
  input: Input;
  entityIndex: number;
};

/** A contribution's across, stacking, and collapse positions. */
function _getContributionPoseFromRowsAndFrame({
  entityRows,
  observation,
  groupStart,
  index,
  frame,
  motion,
}: Readonly<{
  entityRows: Input["observations"];
  observation: Input["observations"][number];
  groupStart: number;
  index: number;
  frame: number;
  motion: VideoMotion;
}>): { x: number; y: number } {
  const rank = entityRows.findIndex(({ id }) => {
    return id === observation.id;
  });
  const stackY = groupStart + 36 + rank * 20;
  // Each move runs cue to cue: across from 49, into the stack from 61, and
  // collapsed from 86 until the contributions unmount at 105.
  const travel = motion.travel.easing;
  const y = Motion.mix({
    t: Motion.ramp({ frame, at: 61, dur: 82 - 61, easing: travel }),
    from: 154 + index * 60,
    to: stackY,
  });
  return {
    x: Motion.mix({
      t: Motion.ramp({ frame, at: 49, dur: 61 - 49, easing: travel }),
      from: 60,
      to: 235,
    }),
    y: Motion.mix({
      t: Motion.ramp({ frame, at: 86, dur: 105 - 86, easing: travel }),
      from: y,
      to: groupStart + 36,
    }),
  };
}
