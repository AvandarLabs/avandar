import { Text } from "../../../graphics-common";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

const GRAPHEME_SEGMENTER: Intl.Segmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

type Props = {
  text: string;
  x: number;
  y: number;
  /** The decision type role; `size` overrides its size, for example in width tests. */
  role?: "choice" | "question";
  size?: number;
  width?: number;
  fill?: string;
};

function _append({ lines, text, width, size }: AppendOptions): string[] {
  const candidate = `${lines.at(-1) ?? ""}${text}`;
  return lines.length &&
    getConservativeWidthFromText({
      text: candidate.trimEnd(),
      fontSize: size,
    }) <= width
    ? [...lines.slice(0, -1), candidate]
    : [...lines, text];
}

function _wrap({
  text,
  width,
  fontSize,
}: Readonly<{ text: string; width: number; fontSize: number }>): string[] {
  const tokens = text.match(/\S+\s*|\s+/g) ?? [""];
  return tokens.reduce<string[]>((result, token) => {
    return getConservativeWidthFromText({
      text: token.trimEnd(),
      fontSize,
    }) > width
      ? Array.from(GRAPHEME_SEGMENTER.segment(token)).reduce(
          (chunks, { segment }) =>
            _append({ lines: chunks, text: segment, width, size: fontSize }),
          result,
        )
      : _append({ lines: result, text: token, width, size: fontSize });
  }, []);
}

/** Stable, bounded SVG lines preserve every authored character. */
export function ForkLabel({
  text,
  x,
  y,
  role = "choice",
  size,
  width = 168,
  fill,
}: Readonly<Props>): ReactNode {
  const roleStyle = useGraphicTokens().text.graphic[role];
  const fontSize = size ?? roleStyle.fontSize;
  const { lineGap } = useGraphicProps("DecisionFork", {});
  const lines = _wrap({ text, width, fontSize });
  return (
    <g aria-label={text}>
      {lines.map((line, index) => (
        <Text
          key={index}
          role={role}
          x={x}
          y={y + index * (fontSize + lineGap)}
          size={fontSize}
          anchor="middle"
          fill={fill}
        >
          {line}
        </Text>
      ))}
    </g>
  );
}
/** Inputs for append. */
type AppendOptions = {
  lines: readonly string[];
  text: string;
  width: number;
  size: number;
};
