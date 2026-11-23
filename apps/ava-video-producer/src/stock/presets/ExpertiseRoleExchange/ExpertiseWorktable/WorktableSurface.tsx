import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the worktable surface in authored paint order. */
export function WorktableSurface(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M290 330 H675 V356 H290 Z M320 356 V390 M655 356 V390",
        }}
        profile={options.tokens.sketch.shape}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.line}
        strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
      />
      <StockRect
        x={350}
        y={312}
        width={260}
        height={16}
        fill="none"
        stroke={options.tokens.color.inactive}
      />
    </>
  );
}
