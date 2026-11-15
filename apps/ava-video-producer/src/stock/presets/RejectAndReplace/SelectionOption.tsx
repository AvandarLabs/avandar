import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { SelectionCopy } from "./SelectionCopy";
import { SelectionMarker } from "./SelectionMarker";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
  isReplacement: boolean;
};
/**
 * One option retains a legible rationale as the shared selection role changes.
 */
export function SelectionOption({
  frame,
  input,
  accent,
  isReplacement,
}: Readonly<Props>): ReactNode {
  const move = ramp(frame, 48, 30, EASE.inOut);
  const entry = ramp(
    frame,
    isReplacement ? 78 : 12,
    isReplacement ? 30 : 18,
    EASE.inOut,
  );
  const x = isReplacement ? mix(entry, 1000, 480) : mix(move, 480, 156);
  const width = isReplacement ? 320 : mix(move, 320, 296);
  const panel = { x: -width / 2, y: 210, width, height: 304, rx: 18 };
  return (
    <g
      data-option={isReplacement ? "replacement" : "rejected"}
      opacity={entry}
      transform={`translate(${x} 0)`}
    >
      <rect
        {...panel}
        fill={STOCK.surface}
        stroke={isReplacement ? accent : STOCK.line}
      />
      <SelectionMarker
        {...{ frame, accent, isReplacement }}
        rejectionMark={input.rejectionMark}
      />
      <SelectionCopy {...{ frame, input, isReplacement }} />
    </g>
  );
}
