import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  personIndex: number;
  eventId: string;
  showGuides: boolean;
  accent: string;
};
/** Actor contact is independent from optional explanatory action guides. */
export function StampHandling({
  x,
  y,
  personIndex,
  eventId,
  showGuides,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M105 ${200 + personIndex * 160} L${x} ${y}`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
      <circle data-stamping-hand={eventId} cx={x} cy={y} r={5} fill={accent} />
      {showGuides ? (
        <g data-action-guide={eventId}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M115 ${200 + personIndex * 160} L${x} ${y + 10}`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.inactive}
            strokeDasharray={tokens.dash.guide.join(" ")}
          />
        </g>
      ) : undefined}
    </g>
  );
}
