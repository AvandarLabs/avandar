import { BasinCaption } from "./BasinCaption";
import { BasinWater } from "./BasinWater";
import { OutletOperator } from "./OutletOperator";
import { SceneLabel } from "./SceneLabel";
import { WaterDestinations } from "./WaterDestinations";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";
/** Explicit content joins the shared stock frame contract. */
export type Props = GraphicProps & { input: Input };
/**
 * Supplied event volumes partition through a finite basin and visible spill.
 */
export function StormwaterStorageSpill({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel
        text={input.boundary.locationLabel}
        x={55}
        y={34}
        width={420}
      />
      <SceneLabel
        text={input.boundary.periodLabel}
        x={500}
        y={34}
        width={405}
      />
      <SceneLabel text={input.decision.actorLabel} x={55} y={78} width={400} />
      <SceneLabel
        text={input.decision.actionLabel}
        x={500}
        y={78}
        width={405}
      />
      <SceneLabel text={input.copy.inflow} x={500} y={145} width={215} />
      <BasinCaption input={input} />
      <BasinWater input={input} frame={frame} accent={accent} />
      <OutletOperator frame={frame} accent={accent} />
      <WaterDestinations input={input} frame={frame} />
    </g>
  );
}
