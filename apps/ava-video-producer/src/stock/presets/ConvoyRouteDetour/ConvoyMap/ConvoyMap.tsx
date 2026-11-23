import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getConvoyRouteFromRole } from "../getConvoyRouteFromRole";
import { ConvoyMapObstruction } from "./ConvoyMapObstruction";
import { ConvoyRoute } from "./ConvoyRoute";
import type { Input } from "../ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

/** Authored roads retain the closure even after the receiving gate opens. */
export function ConvoyMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  // ConvoyRouteDetour.schema requires exactly one blocked route with at
  // least four points.
  const points = getConvoyRouteFromRole({ input, role: "blocked" }).points;
  const start = points[input.obstruction.segmentIndex];
  const end = points[input.obstruction.segmentIndex + 1];
  return (
    <g>
      {input.routes.map((route, index) => {
        return (
          <ConvoyRoute
            key={route.role}
            frame={frame}
            accent={accent}
            tokens={tokens}
            motion={motion}
            scales={scales}
            route={route}
            index={index}
          />
        );
      })}
      <ConvoyMapObstruction
        input={input}
        frame={frame}
        accent={accent}
        tokens={tokens}
        scales={scales}
        start={start}
        end={end}
      />
    </g>
  );
}
