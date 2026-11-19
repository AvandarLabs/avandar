import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string;
  isOutput: boolean;
  accent: string;
};

/** A preview value's size, as content: no graphic text role is 14 px. */
const VALUE_FONT_SIZE = 14;
/** One literal value occupies a single bounded whitespace-preserving lane. */
export function PreviewValue({
  label,
  value,
  isOutput,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const y = isOutput ? 516 : 441;
  const color = isOutput ? accent : tokens.color.text;
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
        color={isOutput ? accent : tokens.color.textMuted}
      />
      <text
        data-preview-input={isOutput ? undefined : value}
        data-preview-output={isOutput ? value : undefined}
        aria-label={value}
        x={88}
        y={y + 27}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontSize={VALUE_FONT_SIZE}
        xmlSpace="preserve"
        fill={color}
      >
        {value}
      </text>
    </g>
  );
}
