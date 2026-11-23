import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LunchLabels } from "./LunchLabels";
import { LunchTray } from "./LunchTray/LunchTray";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";
/** Inputs for SchoolLunchTrayComposition. */
type Props = GraphicProps & { input: Input };
/** Serving preserves every planned tray without scoring the learners. */
export function SchoolLunchTrayComposition({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={30}
        y={208}
        width={900}
        height={304}
        rx={scales.corner(20)}
        fill={tokens.color.surface}
        fillOpacity={scales.wash(atomic.opacity["35"])}
        stroke={tokens.color.line}
      />
      <LunchLabels input={input} accent={accent} frame={frame} />
      {input.learners.map((learner, index) => {
        return (
          <LunchTray
            key={learner.id}
            input={input}
            index={index}
            frame={frame}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
