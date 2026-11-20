import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = { input: Input; origin: number; rulerY: number };
/** Ruler Ticks for the authored scene. */
export function RulerTicks({
  input,
  origin,
  rulerY,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return Array.from({ length: input.task.value + 1 }, (_, index) => {
    return (
      <g key={index}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${origin + index * 12} ${rulerY + 6} v7`,
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
        />
      </g>
    );
  });
}
