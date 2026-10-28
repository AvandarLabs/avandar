import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import { CapabilityColumn } from "./CapabilityColumn";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input };
/** The table skeleton establishes shared row and column geometry first. */
export function CapabilityGrid({ frame, input }: Readonly<Props>): ReactNode {
  const height = input.capabilities.length * 66;
  const panel = { x: 54, y: 176, width: 854, height, rx: 8 };
  const caption = {
    text: input.caption,
    x: 480,
    y: 48,
    width: 840,
    fontSize: 24 as const,
    maxLines: 2,
  };
  return (
    <g>
      <g aria-label={input.caption} opacity={ramp(frame, 12, 18)}>
        <FitText
          {...caption}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
        />
      </g>
      <g opacity={ramp(frame, 18, 18)}>
        <StockRect {...panel} fill={STOCK.surface} stroke={STOCK.line} />
        {input.options.map((option, index) => (
          <CapabilityColumn
            key={option.id}
            {...{ option, index, height }}
            columnWidth={606 / input.options.length}
          />
        ))}
        {input.capabilities.map((row, index) => (
          <line
            key={row.id}
            x1={54}
            x2={908}
            y1={176 + index * 66}
            y2={176 + index * 66}
            stroke={STOCK.line}
          />
        ))}
      </g>
    </g>
  );
}
