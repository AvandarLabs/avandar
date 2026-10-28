import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
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
  const progress = ramp(frame, 36 + index * 12, 12, EASE.inOut);
  const foodY = mix(progress, -16, 34);
  const outlineEmphasis =
    !isServed && emphasize
      ? ramp(frame, 88, 4, EASE.inOut) * (1 - ramp(frame, 100, 4, EASE.inOut))
      : 0;
  return (
    <g transform={`translate(0 ${index * 72})`} data-compartment={component.id}>
      <rect
        x={-65}
        y={0}
        width={130}
        height={70}
        rx={8}
        fill={STOCK.surface}
        stroke={STOCK.line}
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
