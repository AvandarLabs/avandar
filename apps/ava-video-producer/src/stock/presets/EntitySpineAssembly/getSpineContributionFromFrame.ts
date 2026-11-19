import { mix, ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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

/** Foreground numeric contribution position through stacking and collapse. */
export function getSpineContributionFromFrame({
  input,
  observation,
  index,
  frame,
  motion,
}: Readonly<Params>): GetSpineContributionFromFrameResult {
  const entityIndex = input.entities.findIndex(({ id }) => {
    return id === observation.entityId;
  });
  const groupStart =
    112 +
    input.entities.slice(0, entityIndex).reduce((height, entity) => {
      const numEntityObservations = input.observations.filter(
        ({ entityId }) => {
          return entityId === entity.id;
        },
      ).length;
      return (
        height + (numEntityObservations ? numEntityObservations * 20 + 34 : 0)
      );
    }, 0);
  const entityRows = input.observations.filter(({ entityId }) => {
    return entityId === observation.entityId;
  });
  const rank = entityRows.findIndex(({ id }) => {
    return id === observation.id;
  });
  const stackY = groupStart + 36 + rank * 20;
  // Each move runs cue to cue: across from 49, into the stack from 61, and
  // collapsed from 86 until the contributions unmount at 105.
  const travel = motion.travel.easing;
  const y = mix(ramp(frame, 61, 82 - 61, travel), 154 + index * 60, stackY);
  return {
    x: mix(ramp(frame, 49, 61 - 49, travel), 60, 235),
    y: mix(ramp(frame, 86, 105 - 86, travel), y, groupStart + 36),
    opacity: 1 - ramp(frame, 96, 105 - 96, motion.exit.easing),
    groupStart,
    entityIndex,
    sum: entityRows.reduce((total, { value }) => {
      return total + value;
    }, 0),
  };
}
