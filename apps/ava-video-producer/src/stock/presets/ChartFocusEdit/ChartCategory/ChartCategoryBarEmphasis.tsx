import { Motion } from "../../../../motion";
import { CategoryLabel } from "../CategoryLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ChartFocusEdit.schema";
import type { RefinementMotion } from "../RefinementMotion";
import type { ReactNode } from "react";

type ParentProps = {
  category: Input["categories"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  category: Readonly<ParentProps>["category"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  refinement: ReturnType<typeof RefinementMotion.getRefinementFromFrame>;
  direct: ReturnType<typeof RefinementMotion.getRefinementFromFrame> | number;
  emphasized: boolean;
  y: number;
};

/** A bar's corner before the corner style scales it. */
const BAR_CORNER = 2;

/** Renders the chart category bar emphasis in authored paint order. */
export function ChartCategoryBarEmphasis(options: Readonly<Props>): ReactNode {
  return (
    <>
      <g
        data-bar-emphasis={options.category.id}
        opacity={
          options.emphasized
            ? Motion.mix({
                t: options.refinement,
                from: 1,
                to: options.atomic.opacity["35"],
              })
            : 1
        }
      >
        <rect
          data-chart-bar={options.category.id}
          x={344}
          y={options.y}
          width={(options.category.value / options.input.axisMaximum) * 400}
          height={20}
          rx={options.scales.corner(BAR_CORNER)}
          fill={options.accent}
        />
      </g>
      <CategoryLabel
        category={options.category}
        direct={options.direct}
        y={options.y}
      />
    </>
  );
}
