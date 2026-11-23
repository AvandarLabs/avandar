import { Packet } from "../../graphics-common/Packet/Packet";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { BusPacketsData } from "./EventBus.types";
import type { ReactNode } from "react";

type Props = BusPacketsData;

/** Renders the bus packets layer for EventBus. */
export function BusPackets(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M165 306 H794" }}
        profile={options.sketch.shape}
        stroke={options.accent}
        strokeOpacity={options.alpha.dimmed}
        strokeWidth={options.shapes.stroke(options.stroke.default)}
      />
      {options.input.showPackets
        ? [0, 1, 2, 3].map((i) => {
            return (
              <Packet
                key={i}
                frame={options.frame}
                from={{ x: 165, y: 306 }}
                to={{ x: 794, y: 306 }}
                delay={i * 25}
                period={100}
                color={options.accent}
                radius={4.5}
              />
            );
          })
        : null}
    </>
  );
}
