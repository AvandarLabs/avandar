import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ScopeAperture.schema";
import type { ReactNode } from "react";
/** Inputs for ScopeTopicCopy. */
type Props = { topic: Input["topics"][number]; accent: string };
/** A topic label keeps its full authored text clear of the rule stroke. */
export function ScopeTopicCopy({ topic, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <FitText
        text={topic.label}
        x={0}
        y={0}
        width={topic.included ? 420 : 180}
        fontSize={16}
        maxLines={topic.included ? 1 : 4}
        anchor="middle"
        color={topic.included ? accent : tokens.color.textMuted}
        breakLongWords
        normalizeWhitespace
      />
      <SketchedShape
        shape={{ kind: "path", d: "M-38 -20 H38" }}
        profile={tokens.sketch.shape}
        stroke={topic.included ? accent : tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </>
  );
}
