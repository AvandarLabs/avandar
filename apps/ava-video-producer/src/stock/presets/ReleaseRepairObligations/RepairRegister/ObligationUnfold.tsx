import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Point } from "./RepairRegisterShared.types";
import type { ReactNode } from "react";

type Props = {
  issueId: string;
  source: Point;
  lane: Point;
  x: number;
  opacity: number;
  accent: string;
};
/** The dashed path a follow-up unfolds along, from its mark to the register. */
export function ObligationUnfold({
  issueId,
  source,
  lane,
  x,
  opacity,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${source.x} ${source.y} H${lane.x} V${lane.y} H${x - 12} V431`,
      }}
      profile={tokens.sketch.shape}
      data-obligation-unfold={issueId}
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.outline)}
      strokeDasharray={atomic.dash.spaced.join(" ")}
      opacity={opacity}
    />
  );
}
