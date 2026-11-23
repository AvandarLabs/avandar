import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SpliceModuleShared } from "./SpliceModuleShared/SpliceModuleShared";
import { type Props as SpliceModuleSharedProps } from "./SpliceModuleShared/SpliceModuleShared.types";
import type { ReactNode } from "react";

type Props = Pick<SpliceModuleSharedProps, "step" | "accent">;

/** The step's card, outlined in the accent if it is the inserted step. */
export function StepBody({ step, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-step-body={step.id}
      x={0}
      y={0}
      width={140}
      height={110}
      rx={scales.corner(SpliceModuleShared.STEP_CORNER)}
      fill={tokens.color.surface}
      stroke={step.isInserted ? accent : tokens.color.line}
      strokeWidth={scales.stroke(
        step.isInserted ? tokens.stroke.default : tokens.stroke.hairline,
      )}
    />
  );
}
