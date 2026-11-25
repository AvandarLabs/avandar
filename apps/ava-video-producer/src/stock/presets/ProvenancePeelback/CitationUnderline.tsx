import { wrapTextToLines } from "../../primitives/FitText/wrapTextToLines";
import { SketchedShape } from "../../primitives/SketchedShape";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode } from "react";

type Props = {
  source: Input["sources"][number];
  frame: number;
  accent: string;
};
/** Underline only the selected source's first actual excerpt line. */
export function CitationUnderline({
  source,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const firstLine =
    wrapTextToLines({
      text: source.excerpt,
      width: 368,
      fontSize: 14 as const,
      maxLines: 8,
      breakLongWords: true,
      normalizeWhitespace: true,
    })[0] ?? "";
  const width = Math.min(
    368,
    getConservativeWidthFromText({ text: firstLine, fontSize: 14 as const }),
  );
  return (
    <SketchedShape
      shape={{ kind: "line", x1: 16, y1: 96, x2: 16 + width, y2: 96 }}
      profile={tokens.sketch.shape}
      data-citation-underline={source.id}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.hairline)}
      opacity={motion.ramp(frame, 82, motion.scale(22))}
    />
  );
}
