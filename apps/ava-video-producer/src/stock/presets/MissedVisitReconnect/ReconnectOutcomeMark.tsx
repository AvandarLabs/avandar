import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = {
  outcome: Input["cases"][number]["outcome"];
  x: number;
  y: number;
  frame: number;
  accent: string;
};
/** The same distinct outcome symbols identify rows and ledger entries. */
export function ReconnectOutcomeMark({
  outcome,
  x,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g transform={`translate(${x - 395} 0)`}>
      <g data-outcome-mark={outcome}>
        <SketchedShape
          shape={{
            kind: "path",
            d:
              outcome === "unreached"
                ? `M390 ${y - 5} l10 10 M390 ${y + 5} l10 -10`
                : outcome === "contacted"
                  ? `M387 ${y - 7} h20 v12 h-10 l-5 5 v-5 h-5 Z`
                  : outcome === "booked"
                    ? `M390 ${y - 8} h15 v16 h-15 Z`
                    : `M388 ${y} l6 6 12 -13`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          opacity={motion.ramp(frame, 106, motion.whip, motion.reveal.easing)}
        />
      </g>
    </g>
  );
}
