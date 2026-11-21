import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ObservationFieldTeamGetTeamPositionValue } from "../ObservationFieldTeam";
import type { ReactNode } from "react";

type Props = {
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: ObservationFieldTeamGetTeamPositionValue["x"];
  y: ObservationFieldTeamGetTeamPositionValue["y"];
  handX: ObservationFieldTeamGetTeamPositionValue["handX"];
  check: ObservationFieldTeamGetTeamPositionValue["check"];
  reach: ObservationFieldTeamGetTeamPositionValue["reach"];
};
/** Shows the sampling hand reaching and marking its check point. */
export function ObservationSamplingHand({
  atomic,
  tokens,
  scales,
  x,
  y,
  handX,
  check,
  reach,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: `M ${x + 3} ${y} L ${handX} ${y}` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill="none"
      />
      <circle
        data-sampling-hand="true"
        data-target={check.id}
        cx={handX}
        cy={y}
        r={2}
        fill={tokens.color.highlight}
      />
      {reach > 0 ? (
        <circle
          cx={handX}
          cy={y}
          r={4 * reach}
          fill={tokens.color.highlight}
          fillOpacity={scales.wash(atomic.opacity["30"])}
        />
      ) : undefined}
    </>
  );
}
