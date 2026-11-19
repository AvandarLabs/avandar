import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCapacityFromFloorTiles } from "./getCapacityFromFloorTiles";
import { ShelterAccounting } from "./ShelterAccounting";
import { ShelterFloor } from "./ShelterFloor";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
      <g opacity={motion.reveal(frame, 108)}>
        {Array.from({ length: values.equivalents + 1 }, (_, index) => {
          return (
            <g key={index} data-place-division={index}>
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${60 + (values.usable === 0 ? 0 : ((index * input.illustrativeAreaPerPlace) / values.usable) * width)} 388v28`,
                }}
                profile={tokens.sketch.shape}
                stroke={accent}
                strokeWidth={scales.stroke(0.8)}
              />
            </g>
          );
        })}
      </g>
      <ShelterAccounting input={input} frame={frame} />
    </g>
  );
}
