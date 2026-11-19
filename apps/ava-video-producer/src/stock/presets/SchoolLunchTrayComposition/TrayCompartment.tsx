import { mix } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CompartmentLabel } from "./CompartmentLabel";
import { ServedFood } from "./ServedFood";
import { ServingUtensil } from "./ServingUtensil";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";

type Props = {
  component: Input["plannedComponents"][number];
  frame: number;
  index: number;
  isServed: boolean;
  showNames: boolean;
  emphasize: boolean;
  accent: string;
};
/** Each compartment receives only its authored type from a moving spoon. */
export function TrayCompartment({
  component,
  frame,
  index,
  isServed,
  showNames,
  emphasize,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const progress = motion.ramp(
    frame,
    36 + index * 12,
    motion.scale(12),
    motion.travel.easing,
  );
  const foodY = mix(progress, -16, 34);
  const outlineEmphasis =
    !isServed && emphasize
      ? motion.ramp(frame, 88, motion.press.duration, motion.travel.easing) *
        (1 -
          motion.ramp(frame, 100, motion.press.duration, motion.travel.easing))
      : 0;
  return (
    <g transform={`translate(0 ${index * 72})`} data-compartment={component.id}>
      <StockRect
        x={-65}
        y={0}
        width={130}
        height={70}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={mix(outlineEmphasis, 1, 2)}
      />
      <CompartmentLabel
        component={component}
        index={index}
        showNames={showNames}
      />
      <ServedFood
        component={component}
        frame={frame}
        index={index}
        foodY={foodY}
        accent={accent}
        isServed={isServed}
      />
      <ServingUtensil
        component={component}
        frame={frame}
        index={index}
        foodY={foodY}
        isServed={isServed}
      />
    </g>
  );
}
