import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode } from "react";

type Props = {
  selected: Input["sources"][number];
  showLocators: boolean;
  frame: number;
  accent: string;
};
/** The link from the summary to the selected source's cited passage. */
export function FocalCitation({
  selected,
  showLocators,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g
      data-focal-citation="authored"
      data-source-id={selected.id}
      data-excerpt={selected.excerpt}
      data-locator={showLocators ? selected.locator : undefined}
      opacity={motion.ramp(frame, 82, motion.scale(22))}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M464 330H480V192H512" }}
        profile={tokens.sketch.shape}
        data-citation-link="selected-passage"
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
      />
    </g>
  );
}
