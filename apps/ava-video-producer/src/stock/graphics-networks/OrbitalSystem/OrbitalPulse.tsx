import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { CENTER } from "./OrbitalSystem.constants";
import type { OrbitalPulseData } from "./OrbitalSystem.types";
import type { ReactNode } from "react";

type Props = OrbitalPulseData;

/** Renders the orbital pulse layer for OrbitalSystem. */
export function OrbitalPulse(options: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "circle",
        cx: CENTER.x,
        cy: CENTER.y,
        r:
          options.style.pulseRadius +
          Motion.wave({
            frame: options.frame,
            period: options.style.pulsePeriod,
          }) *
            options.style.pulseSwing,
      }}
      profile={options.tokens.sketch.shape}
      fill={options.accent}
      fillOpacity={options.shapes.wash(options.style.pulseAlpha)}
      stroke={options.accent}
      strokeOpacity={options.style.pulseStrokeAlpha}
      strokeWidth={options.shapes.stroke(options.style.pulseStrokeWidth)}
    />
  );
}
