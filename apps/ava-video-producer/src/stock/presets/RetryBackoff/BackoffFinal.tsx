import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RetryBackoff.schema";
import type { ReactNode } from "react";

type Props = { outcome: Input["attempts"][number]["outcome"]; x: number };
/** The declared final outcome draws a completion socket or stop cap. */
export function BackoffFinal({ outcome, x }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-final-outcome={outcome}>
      {outcome === "complete" ? (
        <SketchedShape
          shape={{ kind: "circle", cx: x, cy: 310, r: 18 }}
          profile={tokens.sketch.shape}
          data-completed-socket="true"
          fill="none"
          stroke={tokens.color.positive}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: `M${x + 18} 284 V336` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          strokeWidth={scales.stroke(5)}
        />
      )}
    </g>
  );
}
