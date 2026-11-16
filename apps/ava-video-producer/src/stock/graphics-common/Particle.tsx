import { wave } from "../../motion";
import { useGraphicProps } from "../theme/useGraphicTheme/useGraphicTheme";

/** A themed, twinkling ambient particle with an optional halo. */
export function Particle({
  x,
  y,
  frame,
  phase,
  color,
  haloColor,
  isLarge,
}: {
  x: number;
  y: number;
  frame: number;
  phase: number;
  color: string;
  haloColor: string;
  isLarge: boolean;
}) {
  const particle = useGraphicProps("Particle", {});
  const floor = particle.twinkleFloor;
  return (
    <g
      opacity={floor + wave(frame, particle.twinklePeriod, phase) * (1 - floor)}
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
