import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { fieldId: string; y: number; progress: number };

/** A review bracket for a field whose conflict no source resolves. */
export function ReviewBracket({
  fieldId,
  y,
  progress,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-review-field={fieldId}>
      <SketchedShape
        shape={{ kind: "path", d: `M468 ${y + 34}h12v58h12` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        fill="none"
        opacity={progress}
      />
    </g>
  );
}
