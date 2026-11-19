import { Text } from "../../graphics-common/Text";
import { LEGACY_ACCENT_HEX } from "../../presets/legacy/legacyAccentHex";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { FIRST_LINE_Y, LINE_STEP } from "./CodeFocus.constants";
import type { CodeFocusInput } from "../../presets/CodeFocus/CodeFocus.schema";
import type { ReactNode } from "react";

type CodeLine = CodeFocusInput["lines"][number];

type Props = Readonly<{
  codeTokens: CodeLine;
  index: number;
  accent: string;
}>;

/**
 * One numbered code line. A token in the legacy accent hex keeps meaning the
 * graphic's accent.
 */
export function CodeLineRow({ codeTokens, index, accent }: Props): ReactNode {
  const tokens = useGraphicTokens();
  const code = tokens.text.graphic.code;
  const y = FIRST_LINE_Y + index * LINE_STEP;
  return (
    <g>
      <Text role="lineNumber" x={111} y={y} anchor="end">
        {index + 1}
      </Text>
      <text
        x={144}
        y={y}
        fontSize={code.fontSize}
        fontFamily={code.fontFamily}
        fontWeight={code.fontWeight}
        xmlSpace="preserve"
      >
        {codeTokens.map((token, j) => {
          return (
            <tspan
              key={j}
              fill={getContentColorFromValue(
                token.color === LEGACY_ACCENT_HEX ? "accent" : token.color,
                { tokens, accent },
              )}
            >
              {token.text}
            </tspan>
          );
        })}
      </text>
    </g>
  );
}
