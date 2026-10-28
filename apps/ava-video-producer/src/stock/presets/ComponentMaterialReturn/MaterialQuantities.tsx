import { ramp } from "../../../motion";
import { getMaterialBalanceFromInput } from "./getMaterialBalanceFromInput";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; assembled: number };
/**
 * Destination quantities remain visible even when the optional equation hides.
 */
export function MaterialQuantities({
  input,
  frame,
  assembled,
}: Readonly<Props>): ReactNode {
  const { returned, replacement, recycle, residue } =
    getMaterialBalanceFromInput(input);
  const values = [
    { value: returned, x: 50, y: 350, width: 270 },
    { value: replacement, x: 50, y: 395, width: 270 },
    { value: assembled, x: 420, y: 350, width: 280 },
    { value: recycle, x: 730, y: 120, width: 210 },
    { value: residue, x: 730, y: 212, width: 210 },
  ];
  return (
    <g opacity={ramp(frame, 108, 12)}>
      {values.map(({ value, x, y, width }, index) => (
        <SceneLabel
          key={index}
          text={`${value} ${input.copy.unit}`}
          x={x}
          y={y}
          width={width}
          lines={3}
        />
      ))}
    </g>
  );
}
