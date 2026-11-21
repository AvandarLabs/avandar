import { Eyebrow } from "../../graphics-common/Eyebrow";
import { StockRect } from "../../primitives/StockRect";
import { BUS_CORNER, BUS_FILL_ALPHA } from "./EventBus.constants";
import type { BusTrackData } from "./EventBus.types";
import type { ReactNode } from "react";

type Props = BusTrackData;

/** Renders the bus track layer for EventBus. */
export function BusTrack(options: Readonly<Props>): ReactNode {
  return (
    <>
      <Eyebrow>{options.input.heading}</Eyebrow>
      <StockRect
        x={136}
        y={277}
        width={688}
        height={58}
        rx={options.shapes.corner(BUS_CORNER)}
        fill={options.accent}
        fillOpacity={options.shapes.wash(BUS_FILL_ALPHA)}
        stroke={options.accent}
        strokeOpacity={options.atomic.opacity["35"]}
        strokeWidth={options.shapes.stroke(options.stroke.hairline)}
      />
    </>
  );
}
