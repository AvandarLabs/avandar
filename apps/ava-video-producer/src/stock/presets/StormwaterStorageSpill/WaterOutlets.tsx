import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { WATER_DESTINATIONS } from "./waterDestinationKeys";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Infiltration and controlled discharge occupy separate physical outlets. */
export function WaterOutlets({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const progress = motion.ramp(
    frame,
    48,
    motion.scale(36),
    motion.travel.easing,
  );
  const outlets = [
    {
      id: "infiltration",
      amount: input.event.infiltratedM3,
      path: "M390 380V403H200",
      x: 130,
      color: tokens.color.categorical[WATER_DESTINATIONS.infiltration.category],
    },
    {
      id: "discharge",
      amount: input.event.dischargedM3,
      path: "M620 360H720V400",
      x: 650,
      color: tokens.color.categorical[WATER_DESTINATIONS.discharge.category],
    },
  ];
  return (
    <g>
      {outlets.map((outlet) => {
        return (
          <g key={outlet.id}>
            <g data-outlet={outlet.id}>
              <SketchedShape
                shape={{ kind: "path", d: outlet.path }}
                profile={tokens.sketch.shape}
                fill="none"
                stroke={outlet.color}
                strokeWidth={scales.stroke(tokens.stroke.emphasis)}
                opacity={outlet.amount > 0 ? progress : 0}
              />
            </g>
            <rect
              data-water-pool={outlet.id}
              x={outlet.x}
              y={400}
              width={
                ((140 * outlet.amount) / input.event.incomingM3) * progress
              }
              height={12}
              fill={outlet.color}
            />
          </g>
        );
      })}
    </g>
  );
}
