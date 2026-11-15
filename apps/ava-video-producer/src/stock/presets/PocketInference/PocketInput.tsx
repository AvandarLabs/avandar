import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/** The supplied input fold enters a writing area entirely inside the device. */
export function PocketInput({ frame, input }: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 38, 16);
  const y = mix(progress, 218, 228);
  const labels = [
    { text: input.input.label, y: y + 16, maxLines: 1, color: STOCK.muted },
    { text: input.input.text, y: y + 38, maxLines: 4, color: STOCK.text },
  ];
  return (
    <g>
      <rect
        data-internal-input="local"
        x={202}
        y={y}
        width={556}
        height={94}
        rx={3}
        fill={STOCK.ground}
        stroke={STOCK.line}
      />
      <g opacity={progress}>
        {input.showLabels ? (
          labels.map((label) => (
            <FitText
              key={label.y}
              {...label}
              x={214}
              width={532}
              fontSize={12}
              normalizeWhitespace
              breakLongWords
            />
          ))
        ) : (
          <path
            d={`M214 ${y + 20} h490 M214 ${y + 38} h418`}
            stroke={STOCK.muted}
            strokeWidth={3}
          />
        )}
      </g>
    </g>
  );
}
