import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getSpineContributionFromFrame } from "./getSpineContributionFromFrame";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  observation: Input["observations"][number];
  index: number;
  frame: number;
};
/** The collapsed sum follows a clear gap before entering its derived field. */
export function SpineSum({
  input,
  observation,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const { groupStart, entityIndex, sum } = getSpineContributionFromFrame({
    input,
    observation,
    index,
    frame,
  });
  const gapY = 216 + entityIndex * 100,
    fieldY = 138 + entityIndex * 100;
  const x = mix(ramp(frame, 115, 13, EASE.inOut), 235, 690);
  const y =
    mix(ramp(frame, 106, 9, EASE.inOut), groupStart + 36, gapY) +
    (fieldY - gapY) * ramp(frame, 128, 11, EASE.inOut);
  return (
    <g data-spine-sum={observation.entityId} opacity={ramp(frame, 100, 5)}>
      <LabelSlots labels={[[String(sum), x, y, 216, 12, 1]]} />
    </g>
  );
}
