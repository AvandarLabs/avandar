import { CorridorDecision } from "./CorridorDecision";
import { HabitatCaptions } from "./HabitatCaptions";
import { HabitatLandBalance } from "./HabitatLandBalance";
import { HabitatPlan } from "./HabitatPlan";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";
/** Inputs for HabitatCorridorReconnection. */
type Props = GraphicProps & { input: Input };

/**
 * A supplied footprint reconnects two patches without adding land or claiming
 * species use.
 */
export function HabitatCorridorReconnection({
  frame,
  accent,
  background,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <HabitatCaptions input={input} />
      <CorridorDecision frame={frame} input={input} />
      <HabitatPlan
        frame={frame}
        accent={accent}
        background={background}
        input={input}
      />
      <HabitatLandBalance frame={frame} accent={accent} input={input} />
    </g>
  );
}
