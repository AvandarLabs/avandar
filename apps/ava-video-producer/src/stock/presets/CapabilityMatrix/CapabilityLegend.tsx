import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { CapabilityGlyph } from "./CapabilityGlyph";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/** Authored legend labels explain all four independent categorical states. */
export function CapabilityLegend({ frame, input }: Readonly<Props>): ReactNode {
  const states = ["included", "absent", "conditional", "unknown"] as const;
  return (
    <g opacity={ramp(frame, 96, 12)}>
      {states.map((state, index) => {
        const label = {
          text: input.stateLabels[state],
          x: 94 + index * 218,
          y: 548,
          width: 180,
          fontSize: 14 as const,
          maxLines: 2,
        };
        return (
          <g key={state} aria-label={label.text}>
            <CapabilityGlyph state={state} x={76 + index * 218} y={553} />
            <FitText
              {...label}
              breakLongWords
              normalizeWhitespace
              color={STOCK.muted}
            />
          </g>
        );
      })}
    </g>
  );
}
