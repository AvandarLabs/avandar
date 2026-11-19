import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ReportPageBind.schema";
import type { ReactNode, ComponentProps } from "react";

type Props = {
  section: Input["sections"][number];
  index: number;
  showPageNumbers: boolean;
  margins: number;
  accent: string;
};
/** The section remains readable and its page number follows source order. */
export function ReportPageCopy({
  section,
  index,
  showPageNumbers,
  margins,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const labels: Array<ComponentProps<typeof FitText>> = [
    {
      text: section.heading,
      x: 20,
      y: 22,
      width: 744,
      fontSize: 18 as const,
      maxLines: 2,
    },
    {
      text: section.body,
      x: 20,
      y: 54,
      width: 744,
      fontSize: 14 as const,
      maxLines: 4,
      color: tokens.color.textMuted,
    },
  ];
  return (
    <g>
      {labels.map((label) => {
        return (
          <FitText
            key={`${label.y}:${label.anchor ?? "start"}`}
            {...label}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
      {showPageNumbers ? (
        <text
          data-page-number={index + 1}
          x={-4}
          y={112}
          fill={accent}
          fontFamily={tokens.text.graphic.data.fontFamily}
          fontWeight={tokens.text.graphic.data.fontWeight}
          fontSize={tokens.text.graphic.data.fontSize}
          textAnchor="middle"
          opacity={margins}
        >
          {index + 1}
        </text>
      ) : undefined}
    </g>
  );
}
