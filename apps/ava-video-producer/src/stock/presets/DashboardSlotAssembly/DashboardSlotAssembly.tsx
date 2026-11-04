import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import { DashboardContext } from "./DashboardContext";
import { DashboardGuides } from "./DashboardGuides";
import { DashboardWidgetPanel } from "./DashboardWidgetPanel";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./DashboardSlotAssembly.schema";
import type { ComponentProps, ReactNode } from "react";

type Props = GraphicProps & { input: Input };
const BOARD = {
  x: 16,
  y: 120,
  width: 928,
  height: 468,
  rx: 12,
  fill: "none",
  stroke: STOCK.line,
  strokeWidth: 2,
} satisfies Pick<
  ComponentProps<"rect">,
  "x" | "y" | "width" | "height" | "rx" | "fill" | "stroke" | "strokeWidth"
>;
/** Authored panels dock into a common scope with fixed readable type. */
export function DashboardSlotAssembly({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const panelProps = { input, frame, accent };
  return (
    <g>
      <StockRect {...BOARD} opacity={ramp(frame, 12, 12)} />
      {input.showGuides && frame < 130 ? (
        <DashboardGuides layout={input.layout} frame={frame} accent={accent} />
      ) : undefined}
      {[...input.widgets]
        .sort(
          (first, second) =>
            Number(second.id === input.featuredWidgetId) -
            Number(first.id === input.featuredWidgetId),
        )
        .map((widget) => (
          <DashboardWidgetPanel
            key={widget.id}
            widget={widget}
            index={input.widgets.findIndex(propEq("id", widget.id))}
            {...panelProps}
          />
        ))}
      <DashboardContext input={input} frame={frame} />
    </g>
  );
}
