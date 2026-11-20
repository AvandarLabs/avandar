import { prop } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * An authored investigation bracket encloses only the selected coordinate
 * extent.
 */
export function InvestigationBracket({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const selected = getCasePositionsFromInput(input).filter(
    prop("isInvestigated"),
  );
  const left = Math.min(...selected.map(prop("mapX"))) - 10;
  const right = Math.max(...selected.map(prop("mapX"))) + 10;
  const top = Math.min(...selected.map(prop("mapY"))) - 12;
  const bottom = Math.max(...selected.map(prop("mapY"))) + 12;
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${left + 8} ${top} H${left} V${bottom} H${left + 8} M${right - 8} ${top} H${right} V${bottom} H${right - 8}`,
      }}
      profile={tokens.sketch.shape}
      data-investigation-bracket=""
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.default)}
      opacity={motion.reveal(frame, 24)}
    />
  );
}
