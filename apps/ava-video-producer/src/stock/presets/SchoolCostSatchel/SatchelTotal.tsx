import { ramp } from "../../../motion";
import { SceneText } from "./SceneText";
import type { Input } from "./SchoolCostSatchel.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string; total: number };
/** Draws the scene's SatchelTotal group with fixed authored geometry. */
export function SatchelTotal({
  input,
  frame,
  accent,
  total,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g opacity={ramp(frame, 108, 12)}>
        <path
          data-total-bracket="true"
          d="M333 487 V497 H915 V487 M624 497 V510"
          fill="none"
          stroke={accent}
        />
        <SceneText
          text={input.sceneLabels.total}
          slot={[95, 505, 230, 16, 3]}
        />
        <SceneText
          text={String(total)}
          anchor="middle"
          slot={[624, 538, 240, 28, 1]}
        />
      </g>
    </>
  );
}
