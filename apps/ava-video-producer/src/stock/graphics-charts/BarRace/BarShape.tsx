import { StockRect } from "../../primitives/StockRect";
import { BAR_CORNER } from "./BarRace.constants";
import type { BarShapeData } from "./BarRace.types";
import type { ReactNode } from "react";

type Props = BarShapeData;

/** Renders the bar shape layer for BarRace. */
export function BarShape(options: Readonly<Props>): ReactNode {
  return (
    <>
      <rect
        x={205}
        y={options.y}
        width={Math.max(0.01, options.value * 6)}
        height={43}
        rx={options.shapes.corner(BAR_CORNER)}
        fill={options.barColor}
        fillOpacity={options.atomic.opacity["85"]}
      />
      <StockRect
        x={205}
        y={options.y}
        width={Math.max(0.01, options.value * 6)}
        height={43}
        rx={options.shapes.corner(BAR_CORNER)}
        fill={options.barColor}
        fillOpacity={options.shapes.wash(options.alpha.tint)}
        stroke={options.barColor}
        strokeWidth={options.hairline}
      />
    </>
  );
}
