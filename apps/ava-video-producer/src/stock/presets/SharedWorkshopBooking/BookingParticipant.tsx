import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import type { getBookingFromFrame } from "./getBookingFromFrame";
import type { Input } from "./SharedWorkshopBooking.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getBookingFromFrame>;
  frame: number;
  index: number;
  accent: string;
};
function _getHand({
  input,
  scene,
  frame,
}: Readonly<Pick<Props, "input" | "scene" | "frame">>) {
  const stroke =
    scene.use === 1 ? ramp(frame % 6, 0, 3) * (1 - ramp(frame % 6, 3, 3)) : 0;
  const handX = mix(
    scene.use,
    scene.x + scene.width / 2,
    240 + (input.machine.kind === "workbench" ? stroke * 10 : 0),
  );
  const handY = mix(
    scene.use,
    scene.y,
    405 - (input.machine.kind === "sewing-machine" ? stroke * 4 : 0),
  );
  return { handX, handY };
}
/**
 * One keyed participant keeps contact during agreement and an authored work
 * turn.
 */
export function BookingParticipant({
  input,
  scene,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const request = input.requests[index];
  const personX = mix(scene.use, scene.x + scene.width / 2, 210);
  const personY = mix(scene.use, scene.y - 28, 380);
  const { handX, handY } = _getHand({ input, scene, frame });
  return (
    <g data-participant={request.id}>
      <PersonGlyph
        x={personX}
        y={personY}
        color={accent}
        posture={scene.use === 1 ? "seated" : "standing"}
      />
      <LabelSlots
        labels={[[String(index + 1), personX - 28, personY - 18, 20, 12, 1]]}
      />
      <line
        data-request-hand={request.id}
        x1={personX}
        y1={personY}
        x2={handX}
        y2={handY}
        stroke={accent}
        strokeWidth={3}
      />
      {scene.use === 1 ? (
        <circle
          data-use-person={request.id}
          cx={handX}
          cy={handY}
          r={4}
          fill={accent}
        />
      ) : undefined}
    </g>
  );
}
