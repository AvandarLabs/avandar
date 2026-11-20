import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CategoryTallyShared } from "./CategoryTallyShared/CategoryTallyShared";
import type { ReactNode } from "react";

type Props = {
  categoryId: string;
  count: number;
  y: number;
  frame: number;
  accent: string;
};
/** The category's bar, growing to its member count. */
export function CategoryBar({
  categoryId,
  count: categoryCount,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <rect
      data-category-bar={categoryId}
      x={760}
      y={y - 9}
      height={17}
      width={categoryCount * 16.875 * motion.ramp(frame, 91, motion.scale(41))}
      fill={accent}
      fillOpacity={scales.wash(CategoryTallyShared.BAR_TINT)}
    />
  );
}
