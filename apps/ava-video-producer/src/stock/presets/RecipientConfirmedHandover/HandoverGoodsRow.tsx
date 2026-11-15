import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { HandoverUnit } from "./HandoverUnit";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/** One offered-good row preserves its full units and optional quantity list. */
export function HandoverGoodsRow({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const content = input.contents[index];
  return (
    <g>
      <FitText
        text={content.label}
        x={40}
        y={182 + index * 80}
        width={142}
        fontSize={12}
        maxLines={4}
        normalizeWhitespace
        breakLongWords
      />
      <path
        d={`M190 ${210 + index * 80} H335`}
        stroke={STOCK.line}
        strokeWidth={3}
      />
      {input.showQuantityList ? (
        <text x={40} y={239 + index * 80} fill={STOCK.muted} fontSize={12}>
          {content.offeredUnits} → {content.selectedUnits}
        </text>
      ) : undefined}
      {Array.from({ length: content.offeredUnits }, (_, unitIndex) => (
        <HandoverUnit
          key={unitIndex}
          input={input}
          frame={frame}
          contentIndex={index}
          unitIndex={unitIndex}
          accent={accent}
        />
      ))}
    </g>
  );
}
