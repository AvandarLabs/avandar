import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReferenceLabel } from "./ReferenceLabel";
import type { Input } from "../UncertaintyUnfold.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      {input.reference ? (
        <g opacity={referenceProgress}>
          <SketchedShape
            shape={{
              kind: "line",
              x1: referenceX,
              y1: Motion.mix({
                t: referenceProgress,
                from: 200,
                to: 264,
              }),
              x2: referenceX,
              y2: Motion.mix({
                t: referenceProgress,
                from: 256,
                to: 336,
              }),
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
          <ReferenceLabel text={input.reference.label} />
        </g>
      ) : undefined}
    </>
  );
}
