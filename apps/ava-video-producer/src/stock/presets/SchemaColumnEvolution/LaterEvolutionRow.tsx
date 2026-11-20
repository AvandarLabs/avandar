import { mix } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EvolutionRow } from "./EvolutionRow";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  x: number;
  accent: string;
  expansion: number;
};
/** One supplied later row seats in the retained table. */
export function LaterEvolutionRow({
  input,
  frame,
  x,
  accent,
  expansion,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return frame >= 93 ? (
    <g
      opacity={motion.ramp(frame, 93, motion.scale(20))}
      transform={`translate(0 ${mix(motion.ramp(frame, 93, motion.scale(39), motion.travel.easing), 38, 0)})`}
    >
      <EvolutionRow
        record={input.laterRecord}
        x={x}
        y={220 + input.earlierRecords.length * 65}
        accent={accent}
        expansion={expansion}
        missingLabel={input.fields.missingLabel}
        missingOpacity={1}
        isLater
      />
    </g>
  ) : null;
}
