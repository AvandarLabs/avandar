import { loopPhase } from "../../../../motion";
import { CENTER } from "../OrbitalSystem.constants";
import { BodyMarker } from "./BodyMarker";
import { BodyOrbit } from "./BodyOrbit";
import type { OrbitalSystemInput } from "../../../presets/OrbitalSystem/OrbitalSystem.schema";
import type { ReactNode } from "react";

const LOOP_FRAMES = 180;

type Props = Readonly<{
  orbit: OrbitalSystemInput["bodies"][number];
  frame: number;
  color: string;
  showOrbit: boolean;
}>;

/**
 * One body on its orbit at `frame`: the optional orbit ellipse and the body.
 */
export function OrbitingBody({
  orbit,
  frame,
  color,
  showOrbit,
}: Props): ReactNode {
  const angle = loopPhase(frame, LOOP_FRAMES, orbit.phase) * Math.PI * 2;
  const rotation = (orbit.angle * Math.PI) / 180;
  const x = orbit.rx * Math.cos(angle);
  const y = orbit.ry * Math.sin(angle);
  const px = CENTER.x + x * Math.cos(rotation) - y * Math.sin(rotation);
  const py = CENTER.y + x * Math.sin(rotation) + y * Math.cos(rotation);
  return (
    <g>
      {showOrbit ? (
        <BodyOrbit
          rx={orbit.rx}
          ry={orbit.ry}
          angle={orbit.angle}
          color={color}
        />
      ) : null}
      <BodyMarker x={px} y={py} label={orbit.label} color={color} />
    </g>
  );
}
