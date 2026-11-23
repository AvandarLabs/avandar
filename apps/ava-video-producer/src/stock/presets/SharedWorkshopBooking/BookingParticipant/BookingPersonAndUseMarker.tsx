import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { RequestArm } from "./RequestArm";
import type { getBookingFromFrame } from "../getBookingFromFrame";
import type { Input } from "../SharedWorkshopBooking.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  scene: ReturnType<typeof getBookingFromFrame>;
  frame: number;
  index: number;
  accent: string;
};

type Props = {
  scene: Readonly<ParentProps>["scene"];
  index: Readonly<ParentProps>["index"];
  accent: Readonly<ParentProps>["accent"];
  request: Readonly<ParentProps>["input"]["requests"][number];
  personX: number;
  personY: number;
  handX: number;
  handY: number;
};

/** Renders the booking person and use marker in authored paint order. */
export function BookingPersonAndUseMarker(options: Readonly<Props>): ReactNode {
  return (
    <>
      <PersonGlyph
        x={options.personX}
        y={options.personY}
        color={options.accent}
        posture={options.scene.use === 1 ? "seated" : "standing"}
      />
      <LabelSlots
        labels={[
          [
            String(options.index + 1),
            options.personX - 28,
            options.personY - 18,
            20,
            12,
            1,
          ],
        ]}
      />
      <RequestArm
        requestId={options.request.id}
        person={{ x: options.personX, y: options.personY }}
        hand={{ x: options.handX, y: options.handY }}
        accent={options.accent}
      />
      {options.scene.use === 1 ? (
        <circle
          data-use-person={options.request.id}
          cx={options.handX}
          cy={options.handY}
          r={4}
          fill={options.accent}
        />
      ) : undefined}
    </>
  );
}
