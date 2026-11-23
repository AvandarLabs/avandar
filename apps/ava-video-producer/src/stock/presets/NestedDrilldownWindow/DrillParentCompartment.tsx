import { Motion } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  group: string;
  index: number;
  isSelected: boolean;
  retainContext: boolean;
  progress: number;
  accent: string;
};
/** A parent group's corner before the corner style scales it. */
const GROUP_CORNER = 6;
/** Parent groups shrink into a context strip without changing membership. */
export function DrillParentCompartment({
  group,
  index,
  isSelected,
  retainContext,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  if (!retainContext && !isSelected && progress === 1) {
    return undefined;
  }
  return (
    <g
      opacity={
        isSelected
          ? 1
          : Motion.mix({
              t: progress,
              from: 1,
              to: retainContext ? atomic.opacity["45"] : 0,
            })
      }
      data-parent-context={retainContext && progress === 1 ? group : undefined}
    >
      <StockRect
        data-parent-group={group}
        x={44 + index * 292}
        y={174}
        width={284}
        height={Motion.mix({
          t: progress,
          from: 390,
          to: 62,
        })}
        rx={scales.corner(GROUP_CORNER)}
        fill={tokens.color.surface}
        stroke={isSelected ? accent : tokens.color.line}
      />
      <LiteralDataText value={group} x={56 + index * 292} y={196} />
    </g>
  );
}
