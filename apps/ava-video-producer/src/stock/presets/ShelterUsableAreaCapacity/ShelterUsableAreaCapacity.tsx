import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getCapacityFromFloorTiles } from "./getCapacityFromFloorTiles";
import { ShelterAccounting } from "./ShelterAccounting";
import { ShelterFloor } from "./ShelterFloor";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
import type { ReactNode } from "react";
/** Explicit authored scene props. */
export type Props = GraphicProps & { input: Input };
/**
 * ShelterUsableAreaCapacity renders the supplied quantities and explicit
 * timeline.
 */
export function ShelterUsableAreaCapacity({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const values = getCapacityFromFloorTiles(input);
  const width = (360 * values.sleeping.length) / input.floorTiles.length;
  return (
    <g
      data-gross={values.gross}
      data-usable={values.usable}
      data-equivalents={values.equivalents}
      data-shortfall={values.shortfall}
      data-spare={values.spare}
    >
      <LabelSlots labels={[[input.copy.context, 60, 30, 840, 14, 2]]} />
      <ShelterFloor input={input} frame={frame} accent={accent} />
      <g opacity={ramp(frame, 108, 12)}>
        {Array.from({ length: values.equivalents + 1 }, (_, index) => (
          <path
            key={index}
            data-place-division={index}
            d={`M${60 + (values.usable === 0 ? 0 : ((index * input.illustrativeAreaPerPlace) / values.usable) * width)} 388v28`}
            stroke={accent}
            strokeWidth={0.8}
          />
        ))}
      </g>
      <ShelterAccounting input={input} frame={frame} />
    </g>
  );
}
