import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { StreamFooter } from "./StreamFooter";
import { StreamHeading } from "./StreamHeading";
import { StreamLane } from "./StreamLane";
import type { Props } from "./PacketStream.types";
import type { ReactNode } from "react";

/** Renders the authored packet study for StockGraphic at a given frame. */
export function PacketStream(props: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { color, stroke, alpha, sketch } = tokens;
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const drawing = {
    ...props,
    atomic,
    tokens,
    color,
    stroke,
    alpha,
    sketch,
    shapes,
    motion,
    hairline: shapes.stroke(stroke.hairline),
  };
  return (
    <g>
      <StreamHeading {...drawing} />
      {props.input.lanes.map((lane, laneIndex) => {
        return (
          <StreamLane
            key={lane.label}
            {...{
              ...drawing,
              lane: { ...lane, y: 208 + laneIndex * 102 },
              laneIndex,
            }}
          />
        );
      })}
      <StreamFooter {...drawing} />
    </g>
  );
}
