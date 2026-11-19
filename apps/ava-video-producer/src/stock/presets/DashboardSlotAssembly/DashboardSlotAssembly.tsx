import { propEq } from "@avandar/utils";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DashboardContext } from "./DashboardContext";
import { DashboardGuides } from "./DashboardGuides";
import { DashboardWidgetPanel } from "./DashboardWidgetPanel";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./DashboardSlotAssembly.schema";
import type { ComponentProps, ReactNode } from "react";

type Props = GraphicProps & { input: Input };
const BOARD = {
  x: 16,
  y: 120,
  width: 928,
  height: 468,
  fill: "none",
} satisfies Pick<
  ComponentProps<"rect">,
  "x" | "y" | "width" | "height" | "fill"
>;
/** Authored panels dock into a common scope with fixed readable type. */
export function DashboardSlotAssembly({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const panelProps = { input, frame, accent };
  return (
    <g>
      <StockRect
        {...BOARD}
        rx={scales.corner(tokens.corner.card)}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        opacity={motion.reveal(frame, 12)}
      />
      {input.showGuides && frame < 130 ? (
        <DashboardGuides layout={input.layout} frame={frame} accent={accent} />
      ) : undefined}
      {[...input.widgets]
        .sort((first, second) => {
          return (
            Number(second.id === input.featuredWidgetId) -
            Number(first.id === input.featuredWidgetId)
          );
        })
        .map((widget) => {
          return (
            <DashboardWidgetPanel
              key={widget.id}
              widget={widget}
              index={input.widgets.findIndex(propEq("id", widget.id))}
              {...panelProps}
            />
          );
        })}
      <DashboardContext input={input} frame={frame} />
    </g>
  );
}
