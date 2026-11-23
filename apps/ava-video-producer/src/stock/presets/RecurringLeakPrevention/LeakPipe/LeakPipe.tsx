import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { OutletFlow } from "./OutletFlow";
import { SideLeak } from "./SideLeak";
import type { Input } from "../RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Normal outlet flow is independently visible from the side leak. */
export function LeakPipe({ input, frame, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const running = frame < 63 || (frame >= 107 && input.retest !== "not-tested");
  const leaking =
    frame < 63 || (frame >= 107 && input.retest === "still-leaking");
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <SketchedShape
        shape={{ kind: "path", d: "M200 245 H750 V340 M200 275 H720 V340" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(7)}
        fill="none"
      />
      <SketchedShape
        shape={{ kind: "path", d: "M473 235 v50 M487 235 v50" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(5)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M720 340 h30" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(6)}
      />
      {running ? <OutletFlow frame={frame} /> : undefined}
      {leaking ? <SideLeak frame={frame} /> : undefined}
    </g>
  );
}
