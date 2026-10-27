import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./EntitySpineAssembly.schema";
type Params = {
  input: Input;
  observation: Input["observations"][number];
  index: number;
  frame: number;
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
}: Readonly<Params>): GetSpineContributionFromFrameResult {
  const entityIndex = input.entities.findIndex(
    ({ id }) => id === observation.entityId,
  );
  const groupStart =
    112 +
    input.entities.slice(0, entityIndex).reduce((height, entity) => {
      const numEntityObservations = input.observations.filter(
        ({ entityId }) => entityId === entity.id,
      ).length;
      return (
        height + (numEntityObservations ? numEntityObservations * 20 + 34 : 0)
      );
    }, 0);
  const entityRows = input.observations.filter(
    ({ entityId }) => entityId === observation.entityId,
  );
  const rank = entityRows.findIndex(({ id }) => id === observation.id);
  const stackY = groupStart + 36 + rank * 20;
  const y = mix(ramp(frame, 61, 21, EASE.inOut), 154 + index * 60, stackY);
  return {
    x: mix(ramp(frame, 49, 12, EASE.inOut), 60, 235),
    y: mix(ramp(frame, 86, 19, EASE.inOut), y, groupStart + 36),
    opacity: 1 - ramp(frame, 96, 9),
    groupStart,
    entityIndex,
    sum: entityRows.reduce((total, { value }) => total + value, 0),
  };
}
