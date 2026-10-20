import { StockRect } from "../../primitives/StockRect/StockRect";
import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** A scanning rule resolves the rows before an authored row or column opens. */
export function CapabilityFocus({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const columnWidth = 606 / input.options.length;
  const height = input.capabilities.length * 66;
  const isRow = input.focus.kind === "row";
  const focusIndex = (isRow ? input.capabilities : input.options).findIndex(
    ({ id }) => id === input.focus.id,
  );
  const focus = ramp(frame, 108, 12);
  const y = 176 + height * ramp(frame, 36, 72, EASE.inOut);
  const bounds = {
    x: isRow ? 54 : 302 + focusIndex * columnWidth,
    y: isRow ? 176 + focusIndex * 66 : 94,
    width: isRow ? 854 : columnWidth,
    height: isRow ? mix(focus, 2, 66) : height + 82,
    rx: 7,
  };
  return (
    <g>
      <line
        x1={54}
        x2={908}
        y1={y}
        y2={y}
        stroke={accent}
        strokeWidth={2}
        opacity={ramp(frame, 36, 6) * (1 - focus)}
      />
      {input.focus.kind !== "none" ? (
        <StockRect
          data-focus={`${input.focus.kind}:${input.focus.id}`}
          {...bounds}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          opacity={focus}
        />
      ) : null}
    </g>
  );
}
