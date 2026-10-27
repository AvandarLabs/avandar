import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PairedContrast.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  alternative: Input["alternatives"][number];
  index: number;
};
/** Equal halves slide apart while their labels keep the same fixed size. */
export function ContrastAlternative({
  frame,
  accent,
  alternative,
  index,
}: Readonly<Props>): ReactNode {
  const separation = ramp(frame, 12, 24, EASE.inOut);
  const panel = {
    x: 48 + index * 512,
    y: 146,
    width: 352,
    height: 408,
    rx: 18,
  };
  const label = {
    text: alternative.label,
    x: 224 + index * 512,
    y: 178,
    width: 312,
    fontSize: 20 as const,
    maxLines: 3,
  };
  return (
    <g
      data-alternative={alternative.id}
      opacity={separation}
      transform={`translate(${mix(separation, index ? -100 : 100, 0)} 0)`}
    >
      <rect {...panel} fill={STOCK.surface} stroke={STOCK.line} />
      <g aria-label={alternative.label}>
        <FitText
          {...label}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
          color={index ? STOCK.mint : accent}
        />
      </g>
    </g>
  );
}
