import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReadingBookShared } from "./ReadingBookShared/ReadingBookShared";
import type { ReactNode } from "react";
/**
 * Places the shared oval reading surface beneath the book for `ReadingBook`.
 */
export function ReadingTable({
  tableX,
}: Readonly<{ tableX: number }>): ReactNode {
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
