import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string;
  isOutput: boolean;
  accent: string;
};
/** One literal value occupies a single bounded whitespace-preserving lane. */
export function PreviewValue({
  label,
  value,
  isOutput,
  accent,
}: Readonly<Props>): ReactNode {
  const y = isOutput ? 516 : 441;
  const color = isOutput ? accent : STOCK.text;
  return (
    <g>
      <FitText
        text={label}
        x={88}
        y={y}
        width={784}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
        color={isOutput ? accent : STOCK.muted}
      />
      <text
        data-preview-input={isOutput ? undefined : value}
        data-preview-output={isOutput ? value : undefined}
        aria-label={value}
        x={88}
        y={y + 27}
        fontFamily="Arial, sans-serif"
        fontSize={14}
        xmlSpace="preserve"
        fill={color}
      >
        {value}
      </text>
    </g>
  );
}
