import { ramp, mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { MaterialCaptions } from "./MaterialCaptions";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; assembled: number };
/**
 * Distinct returned and output silhouettes never suggest a zero-mass assembly.
 */
export function MaterialBoundary({
  input,
  frame,
  assembled,
}: Readonly<Props>): ReactNode {
  const open = ramp(frame, 24, 12);
  const isAppliance = input.assemblyShape === "appliance";
  return (
    <g>
      <path
        data-returned-shell="physical"
        d={`M50 290V335H320V290M50 290L${mix(open, 320, 50)} ${mix(open, 290, 240)}`}
        fill="none"
        stroke={STOCK.line}
        strokeWidth={3}
      />
      {isAppliance ? (
        <circle cx={185} cy={325} r={6} fill="none" stroke={STOCK.muted} />
      ) : (
        <path d="M65 335v8M305 335v8" stroke={STOCK.muted} strokeWidth={3} />
      )}
      {assembled > 0 ? (
        <rect
          data-output-shell="physical"
          x={408}
          y={288}
          width={305}
          height={48}
          rx={isAppliance ? 12 : 2}
          fill="none"
          stroke={STOCK.line}
          strokeWidth={3}
          opacity={ramp(frame, 108, 12)}
        />
      ) : undefined}
      <path
        d="M740 290V335H930V290M740 355V400H930V355"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <MaterialCaptions input={input} />
    </g>
  );
}
