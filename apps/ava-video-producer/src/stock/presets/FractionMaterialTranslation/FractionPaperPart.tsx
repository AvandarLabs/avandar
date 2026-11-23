import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  id: string;
  index: number;
  centerX: number;
  cellWidth: number;
  progress: number;
  selected: boolean;
  accent: string;
};
/** A folded strip resolves into one equal selected or unselected paper part. */
export function FractionPaperPart({
  id,
  index,
  centerX,
  cellWidth,
  progress,
  selected,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const fold = Math.sin(progress * Math.PI) * 18 * (index % 2 === 0 ? -1 : 1);
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${centerX - cellWidth / 2} -24 L${centerX + cellWidth / 2} ${-24 + fold} V${24 + fold} L${centerX - cellWidth / 2} 24 Z`,
      }}
      profile={tokens.sketch.shape}
      data-piece-owner={id}
      data-selected={selected}
      fill={selected ? accent : tokens.color.surface}
      fillOpacity={selected ? progress : 1}
      stroke={tokens.color.text}
      strokeOpacity={progress}
      strokeWidth={scales.stroke(tokens.stroke.hairline)}
    />
  );
}
