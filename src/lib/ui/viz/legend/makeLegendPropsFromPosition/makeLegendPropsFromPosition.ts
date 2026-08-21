import { matchLiteral } from "@avandar/utils";
import type { LegendPosition } from "$/models/vizs/ChartStyle.types";
import type { LegendProps } from "recharts";

/**
 * Width reserved for a legend beside the plot. Recharts sizes a
 * horizontal legend to the full chart width, so a side-positioned one
 * has to declare its own width or it reserves every pixel and collapses
 * the plot to nothing.
 */
const SIDE_LEGEND_WIDTH = 120;

/** The subset of Recharts legend props that a position resolves to. */
type LegendPositionProps = Pick<
  Omit<LegendProps, "ref">,
  "verticalAlign" | "align" | "layout" | "width"
>;

/**
 * Maps a configured legend position onto the Recharts legend props that
 * place it there, including the `layout` and `width` that Recharts needs
 * to reserve plot space for a side legend.
 *
 * Shared by the cartesian charts (through `applyChartStyle`) and by
 * radar, which has no cartesian axes and so cannot use the rest of
 * `applyChartStyle`, but positions its legend the same way.
 */
export function makeLegendPropsFromPosition(
  position: LegendPosition | undefined,
): LegendPositionProps {
  // Recharts reserves plot space from the legend's *measured* box, and
  // only treats the legend as a sidebar when the layout is vertical, so
  // a side position carries its own layout and width.
  return matchLiteral(position ?? "top", {
    top: { verticalAlign: "top", align: "center" },
    bottom: { verticalAlign: "bottom", align: "center" },
    left: {
      verticalAlign: "middle",
      align: "left",
      layout: "vertical",
      width: SIDE_LEGEND_WIDTH,
    },
    right: {
      verticalAlign: "middle",
      align: "right",
      layout: "vertical",
      width: SIDE_LEGEND_WIDTH,
    },
  } as const satisfies Record<LegendPosition, LegendPositionProps>);
}
