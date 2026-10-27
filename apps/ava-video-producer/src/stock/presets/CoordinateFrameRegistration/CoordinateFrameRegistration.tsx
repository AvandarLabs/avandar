import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { RegistrationGrids } from "./RegistrationGrids";
import { RegistrationLedger } from "./RegistrationLedger";
import { RegistrationPoints } from "./RegistrationPoints";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./CoordinateFrameRegistration.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * Affine reference-frame registration leaves target landmark references fixed.
 */
export function CoordinateFrameRegistration({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 34, 880, 16, 2],
          [input.copy.before, 40, 78, 420, 14, 3],
          [input.copy.after, 520, 78, 400, 14, 3],
        ]}
      />
      <RegistrationGrids input={input} frame={frame} />
      <RegistrationPoints input={input} frame={frame} accent={accent} />
      <RegistrationLedger input={input} frame={frame} />
    </g>
  );
}
