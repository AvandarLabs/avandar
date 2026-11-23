import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  zoneId: string;
  points: string;
  first: [number, number];
  index: number;
  frame: number;
  accent: string;
};
/**
 * The unchanged footprint connects to a clear denominator shelf outside the
 * map.
 */
export function ZoneGround({
  zoneId,
  points,
  first,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: `M${points} Z` }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
        strokeDasharray={tokens.dash.pending.join(" ")}
      />
      <g data-denominator-connector={zoneId}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${55 + first[0] * 5} ${180 + first[1] * 2.5} L590 ${178 + index * 80} L627 ${178 + index * 80}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeOpacity={
            tokens.alpha.dimmed *
            motion.ramp(frame, 36, motion.scale(36), motion.entrance.easing)
          }
        />
      </g>
    </g>
  );
}
