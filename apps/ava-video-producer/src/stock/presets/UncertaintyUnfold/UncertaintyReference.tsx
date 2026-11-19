import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";
/** Optional reference blade coordinates and its reveal progress. */
export type Props = {
  input: Input;
  referenceProgress: number;
  referenceX: number;
};
/** Renders the supplied comparison reference when present. */
export function UncertaintyReference({
  input,
  referenceProgress,
  referenceX,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      {input.reference ? (
        <g opacity={referenceProgress}>
          <SketchedShape
            shape={{
              kind: "line",
              x1: referenceX,
              y1: mix(referenceProgress, 200, 264),
              x2: referenceX,
              y2: mix(referenceProgress, 256, 336),
            }}
            profile={tokens.sketch.shape}
            data-reference-blade="true"
            stroke={tokens.color.highlight}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
          <SketchedShape
            shape={{ kind: "path", d: `M${referenceX} 264 L480 220` }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.highlight}
            fill="none"
          />
          <FitText
            text={input.reference.label}
            x={480}
            y={182}
            width={760}
            fontSize={16}
            maxLines={2}
            anchor="middle"
            breakLongWords
            normalizeWhitespace
            color={tokens.color.highlight}
          />
        </g>
      ) : undefined}
    </>
  );
}
