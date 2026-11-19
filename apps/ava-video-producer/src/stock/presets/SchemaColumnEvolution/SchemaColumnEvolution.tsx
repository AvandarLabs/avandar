import { mix } from "../../../motion";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { EvolutionCaptions } from "./EvolutionCaptions";
import { EvolutionHeader } from "./EvolutionHeader";
import { EvolutionRow } from "./EvolutionRow";
import { LaterEvolutionRow } from "./LaterEvolutionRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";
/** Frame-driven complete authored schema extension. */
export type Props = GraphicProps & { input: Input };
/** A new field leaves earlier collection gaps explicit. */
export function SchemaColumnEvolution({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const expansion = motion.ramp(
    frame,
    12,
    motion.scale(36),
    motion.travel.easing,
  );
  const x = mix(expansion, 190, 80);
  return (
    <g>
      <EvolutionCaptions {...{ input, frame }} />
      <EvolutionHeader
        input={input}
        x={x}
        expansion={expansion}
        accent={accent}
      />
      {input.earlierRecords.map((record, index) => {
        return (
          <EvolutionRow
            key={record.id}
            record={record}
            x={x}
            y={220 + index * 65}
            accent={accent}
            expansion={expansion}
            missingLabel={input.fields.missingLabel}
            missingOpacity={motion.ramp(
              frame,
              49 + index * 6,
              motion.scale(31),
            )}
          />
        );
      })}
      <LaterEvolutionRow {...{ input, frame, x, accent, expansion }} />
    </g>
  );
}
