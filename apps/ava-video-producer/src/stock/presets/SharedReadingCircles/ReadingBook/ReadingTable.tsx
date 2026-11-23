import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReadingBookShared } from "./ReadingBookShared";
import type { ReactNode } from "react";

type Props = { tableX: number };

/**
 * Places the shared oval reading surface beneath the book for `ReadingBook`.
 */
export function ReadingTable({ tableX }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "ellipse",
        cx: tableX,
        cy: 330,
        rx: ReadingBookShared.TABLE_RADIUS_X,
        ry: ReadingBookShared.TABLE_RADIUS_Y,
      }}
      profile={tokens.sketch.shape}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
