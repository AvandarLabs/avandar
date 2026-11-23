import { Motion } from "../../motion";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  frame: number;
  phase: number;
  color: string;
  haloColor: string;
  isLarge: boolean;
};
/** A themed, twinkling ambient particle with an optional halo. */
export function Particle({
  x,
  y,
  frame,
  phase,
  color,
  haloColor,
  isLarge,
}: Readonly<Props>): ReactNode {
  const particle = GraphicThemeHooks.useGraphicProps({
    name: "Particle",
    props: {},
  });
  const floor = particle.twinkleFloor;
  return (
    <g
      opacity={
        floor +
        Motion.wave({
          frame,
          period: particle.twinklePeriod,
          offset: phase,
        }) *
          (1 - floor)
      }
    >
      {isLarge ? (
        <circle
          cx={x}
          cy={y}
          r={particle.haloRadius}
          fill={haloColor}
          fillOpacity={particle.haloAlpha}
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        r={isLarge ? particle.radiusLg : particle.radius}
        fill={color}
      />
    </g>
  );
}
