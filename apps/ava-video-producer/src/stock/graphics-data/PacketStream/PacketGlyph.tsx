import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { PACKET_CORNER, PACKET_FILL_ALPHA } from "./PacketStream.constants";
import type { LaneTrackData } from "./PacketStream.types";
import type { ReactNode } from "react";

type Props = LaneTrackData & { x: number };

/** Renders the packet glyph layer for PacketStream. */
export function PacketGlyph(props: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        x={props.x - 35}
        y={props.lane.y - 13}
        width={62}
        height={26}
        rx={props.shapes.corner(PACKET_CORNER)}
        fill={props.laneColor}
        fillOpacity={props.shapes.wash(PACKET_FILL_ALPHA)}
        stroke={props.laneColor}
        strokeOpacity={props.atomic.opacity["65"]}
        strokeWidth={props.hairline}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${props.x - 21} ${props.lane.y} h23` }}
        profile={props.sketch.shape}
        stroke={props.laneColor}
        strokeWidth={props.shapes.stroke(props.stroke.default)}
      />
      <circle
        cx={props.x + 14}
        cy={props.lane.y}
        r={2.5}
        fill={props.laneColor}
      />
    </>
  );
}
