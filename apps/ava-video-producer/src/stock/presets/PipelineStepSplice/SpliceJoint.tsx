import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getSpliceGeometryFromInputAndFrame } from "./getSpliceGeometryFromInputAndFrame";
import type { Input } from "./PipelineStepSplice.schema";
import type { ReactNode } from "react";

type Step = ReturnType<typeof getSpliceGeometryFromInputAndFrame>[number];
type Props = {
  from: Step;
  to: Step;
  index: number;
  closing: number;
  joinStyle: Input["joinStyle"];
  accent: string;
};

/** A continuous ribbon joint's line weight before the theme scales it. */
const RIBBON_STROKE = 12;
/** Closing joints meet the actual adjacent module boundaries. */
export function SpliceJoint({
  from,
  to,
  index,
  closing,
  joinStyle,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g opacity={closing}>
      <g data-final-join={index} data-from={from.id} data-to={to.id}>
        <SketchedShape
          shape={{ kind: "line", x1: from.x + 140, y1: 345, x2: to.x, y2: 345 }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(
            joinStyle === "continuous-ribbon"
              ? RIBBON_STROKE
              : tokens.stroke.default,
          )}
        />
      </g>
      {joinStyle === "tabbed" ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${to.x - 14} 337h14v16h-14Z` }}
          profile={tokens.sketch.shape}
          fill={tokens.color.elevated}
          stroke={accent}
        />
      ) : undefined}
    </g>
  );
}
