import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EvolutionCaptions } from "./EvolutionCaptions";
import { EvolvingColumns } from "./EvolvingColumns";
import { LaterEvolutionRow } from "./LaterEvolutionRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";

/** Frame-driven complete authored schema extension. */
export type Props = GraphicProps & {
  input: Input;
};

/** A new field leaves earlier collection gaps explicit. */
export function SchemaColumnEvolution({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const expansion = motion.ramp(
    frame,
    12,
    motion.scale(36),
    motion.travel.easing,
  );
  const x = Motion.mix({
    t: expansion,
    from: 190,
    to: 80,
  });
  return (
    <g>
      <EvolutionCaptions {...{ input, frame }} />
      <EvolvingColumns
        frame={frame}
        input={input}
        accent={accent}
        motion={motion}
        expansion={expansion}
        x={x}
      />
      <LaterEvolutionRow {...{ input, frame, x, accent, expansion }} />
    </g>
  );
}
