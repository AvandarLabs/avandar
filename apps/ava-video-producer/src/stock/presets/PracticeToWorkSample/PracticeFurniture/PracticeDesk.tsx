import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { x: number; y: number };

/** The practice desk, moving aside with the practice sheet. */
export function PracticeDesk({ x, y }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-practice-desk="true" transform={`translate(${x} ${y})`}>
      <SketchedShape
        shape={{ kind: "path", d: "M0 0 H260 M20 0 V55 M240 0 V55" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(6)}
      />
    </g>
  );
}
