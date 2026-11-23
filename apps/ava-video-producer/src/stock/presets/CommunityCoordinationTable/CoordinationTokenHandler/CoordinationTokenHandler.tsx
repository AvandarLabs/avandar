import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getTeamMarkerPoseFromInputAndFrame } from "../getTeamMarkerPoseFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  bodyX: number;
  bodyY: number;
  teamHandX:
    | ReturnType<typeof getTeamMarkerPoseFromInputAndFrame>["x"]
    | number;
  teamHandY:
    | ReturnType<typeof getTeamMarkerPoseFromInputAndFrame>["y"]
    | number;
};
/** Shows the team representative handling its moving token. */
export function CoordinationTokenHandler({
  accent,
  tokens,
  scales,
  bodyX,
  bodyY,
  teamHandX,
  teamHandY,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <PersonGlyph x={bodyX} y={bodyY} size={36} color={accent} role="worker" />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${bodyX} ${bodyY} L${bodyX - 12} ${teamHandY + 12} L${teamHandX} ${teamHandY}`,
        }}
        profile={tokens.sketch.shape}
        data-team-arm
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle
        data-team-hand
        cx={teamHandX}
        cy={teamHandY}
        r={3}
        fill={accent}
      />
    </>
  );
}
