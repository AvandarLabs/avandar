import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { RegistrationGrid } from "./RegistrationGrid";
import type { Input } from "./CoordinateFrameRegistration.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * Both coordinate frames retain their own axes and units throughout transfer.
 */
export function RegistrationGrids({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {[65, 555].map((x, index) => (
        <g key={x}>
          <RegistrationGrid x={x} index={index} frame={frame} />
          <LabelSlots
            labels={[
              [
                index ? input.frames.target : input.frames.source,
                x,
                140,
                330,
                14,
                2,
              ],
              [
                index ? input.frames.targetUnit : input.frames.sourceUnit,
                x,
                167,
                330,
                12,
                2,
              ],
            ]}
          />
        </g>
      ))}
    </g>
  );
}
