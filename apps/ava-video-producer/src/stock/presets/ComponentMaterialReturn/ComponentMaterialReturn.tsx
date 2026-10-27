import { getMaterialBalanceFromInput } from "./getMaterialBalanceFromInput";
import { MaterialBoundary } from "./MaterialBoundary";
import { MaterialLegend } from "./MaterialLegend";
import { MaterialOperator } from "./MaterialOperator";
import { MaterialParts } from "./MaterialParts";
import { MaterialQuantities } from "./MaterialQuantities";
import { SceneLabel } from "./SceneLabel";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";
/** Explicit content joins the shared stock frame contract. */
export type Props = GraphicProps & { input: Input };
/**
 * Identifiable parts follow declared routes and replacements join the output.
 */
export function ComponentMaterialReturn({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { returned, replacement, recycle, residue, assembled } =
    getMaterialBalanceFromInput(input);
  return (
    <g>
      <SceneLabel text={input.decision.actorLabel} x={45} y={34} width={400} />
      <SceneLabel
        text={input.decision.actionLabel}
        x={500}
        y={34}
        width={410}
      />
      <MaterialBoundary input={input} frame={frame} assembled={assembled} />
      <MaterialParts input={input} frame={frame} />
      <MaterialOperator input={input} frame={frame} accent={accent} />
      <MaterialLegend input={input} />
      <MaterialQuantities input={input} frame={frame} assembled={assembled} />
      <g data-assembled="quantity" data-quantity={assembled}>
        {input.showMassEquation ? (
          <SceneLabel
            text={`${returned} + ${replacement} = ${assembled} + ${recycle} + ${residue} ${input.copy.unit}`}
            x={45}
            y={566}
            width={865}
            lines={1}
          />
        ) : undefined}
      </g>
      <SceneLabel
        text={input.copy.disclaimer}
        x={45}
        y={590}
        width={865}
        lines={1}
      />
    </g>
  );
}
