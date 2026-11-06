import { BatteryEquation } from "./BatteryEquation";
import { BatteryVessel } from "./BatteryVessel";
import { BatteryWindows } from "./BatteryWindows";
import { DispatchOperator } from "./DispatchOperator";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./BatteryDispatchBalance.schema";
import type { ReactNode } from "react";
/** Inputs for BatteryDispatchBalance. */
type Props = GraphicProps & { input: Input };

/**
 * A finite battery fills before the authored later dispatch, with both losses.
 */
export function BatteryDispatchBalance({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <BatteryWindows input={input} />
      <DispatchOperator frame={frame} accent={accent} input={input} />
      <BatteryVessel frame={frame} accent={accent} input={input} />
      <BatteryEquation input={input} />
    </g>
  );
}
