import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CohortPerson } from "./CohortPerson";
import { CohortRecord } from "./CohortRecord";
import { SceneLabel } from "./SceneLabel";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  participant: Input["participants"][number];
  index: number;
  frame: number;
  accent: string;
};
const LANE_DASH = "3 6";
function _getPersonPosition({
  input,
  participant,
  index,
  frame,
  motion,
}: Omit<Props, "accent"> & { motion: VideoMotion }) {
  return input.visits.reduce((position, visit, visitIndex) => {
    return participant.records.find(propEq("visitId", visit.id))?.state ===
      "recorded"
      ? mix(
          motion.ramp(
            frame,
            30 + visitIndex * 18 + index * 2,
            motion.hero,
            motion.travel.easing,
          ),
          position,
          380 + visitIndex * 155,
        )
      : position;
  }, 285);
}
/** Stable identities move only to authored recorded visit positions. */
export function CohortLane({
  input,
  participant,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const y = 185 + index * 40;
  const x = _getPersonPosition({ input, participant, index, frame, motion });
  return (
    <g
      data-participant={participant.id}
      opacity={motion.reveal(frame, 12 + index * 2)}
    >
      <SceneLabel
        text={participant.label}
        x={32}
        y={y - 5}
        width={215}
        lines={2}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M280 ${y + 12} H900` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeDasharray={LANE_DASH}
      />
      {input.visits.map((visit, visitIndex) => {
        return (
          <CohortRecord
            key={visit.id}
            input={input}
            participant={participant}
            visit={visit}
            visitIndex={visitIndex}
            personIndex={index}
            y={y}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <CohortPerson id={participant.id} x={x} y={y - 10} accent={accent} />
    </g>
  );
}
