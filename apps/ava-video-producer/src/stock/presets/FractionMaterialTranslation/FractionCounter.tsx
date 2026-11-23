import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  id: string;
  index: number;
  centerX: number;
  progress: number;
  selected: boolean;
  accent: string;
};
/** Equal physical counters gather into the common fraction's row. */
export function FractionCounter({
  id,
  index,
  centerX,
  progress,
  selected,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "circle",
        cx: Motion.mix({
          t: progress,
          from: -82 + (index % 4) * 54,
          to: centerX,
        }),
        cy: Motion.mix({ t: progress, from: index < 4 ? -36 : 36, to: 0 }),
        r: 8,
      }}
      profile={tokens.sketch.shape}
      data-piece-owner={id}
      data-selected={selected}
      fill={selected ? accent : tokens.color.surface}
      stroke={selected ? accent : tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
