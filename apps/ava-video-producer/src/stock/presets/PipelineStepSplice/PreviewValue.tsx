import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const y = isOutput ? 516 : 441;
  const valueStyle = tokens.text.graphic.value;
  const color = isOutput ? accent : valueStyle.color;
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
        fontFamily={valueStyle.fontFamily}
        fontWeight={valueStyle.fontWeight}
        fontSize={valueStyle.fontSize}
        xmlSpace="preserve"
        fill={color}
      >
        {value}
      </text>
    </g>
  );
}
