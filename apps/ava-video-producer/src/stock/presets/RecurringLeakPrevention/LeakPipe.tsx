import { loopPhase } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The dash of the flowing outlet stream. */
const FLOW_DASH = "12 12";
/** Normal outlet flow is independently visible from the side leak. */
export function LeakPipe({ input, frame, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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

/** Water running through the pipe and out of the outlet. */
function OutletFlow({ frame }: Readonly<{ frame: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-outlet-flow="true">
      <SketchedShape
        shape={{ kind: "path", d: "M220 260 H735 V430" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(5)}
        strokeDasharray={FLOW_DASH}
        strokeDashoffset={-loopPhase(frame, 48) * 48}
        fill="none"
      />
      <SketchedShape
        shape={{ kind: "path", d: "M720 440 h30" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}

/** Drops falling from the leaking joint. */
function SideLeak({ frame }: Readonly<{ frame: number }>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g data-side-leak="true">
      {[0, 1, 2].map((index) => {
        return (
          <circle
            key={index}
            cx={480}
            cy={300 + loopPhase(frame, 30, index * 10) * 110}
            r={4}
            fill={tokens.color.accentAlt}
          />
        );
      })}
    </g>
  );
}
